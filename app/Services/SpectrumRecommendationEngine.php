<?php

namespace App\Services;

use App\Models\Roll;
use App\Models\Location;
use App\Models\LocationRecommendationLog;
use Illuminate\Support\Facades\DB;

class SpectrumRecommendationEngine
{
    /**
     * Generate smart slot recommendations for a roll
     *
     * @param Roll|array $rollData Roll instance or array of roll attributes
     * @param int|null $userId User ID performing the action
     * @param string $actionType 'ASSIGN' | 'MOVE'
     * @param int|null $currentLocationId Current location ID if MOVE
     * @return array
     */
    public static function recommend($rollData, ?int $userId = null, string $actionType = 'ASSIGN', ?int $currentLocationId = null): array
    {
        $roll = is_array($rollData) ? (object)$rollData : $rollData;

        // Fetch all locations with their occupied rolls
        $locations = Location::with(['rolls.grade', 'rolls.jop', 'rolls.user'])->get();
        $occupiedMap = [];
        $columnGrades = [];
        $columnJops = [];
        $columnWeights = [];

        foreach ($locations as $loc) {
            $code = $loc->location;
            $parts = explode('-', $code);
            if (count($parts) === 3) {
                $col = (int)$parts[1];
                $tier = (int)$parts[2];
                $isOccupied = ($loc->status !== 0) && ($loc->id !== $currentLocationId);
                $occupiedMap[$col][$tier] = [
                    'id' => $loc->id,
                    'code' => $code,
                    'isOccupied' => $isOccupied,
                    'status' => $loc->status,
                    'roll' => $loc->rolls->first(),
                ];

                if ($isOccupied && $loc->rolls->isNotEmpty()) {
                    $r = $loc->rolls->first();
                    $gradeName = $r->grade->grade ?? '';
                    $jopName = $r->jop->jop ?? '';
                    if ($gradeName) $columnGrades[$col][] = strtoupper(trim($gradeName));
                    if ($jopName) $columnJops[$col][] = strtoupper(trim($jopName));
                    $columnWeights[$col][] = $r->weight ?? 900;
                }
            }
        }

        // 1. Operator Habitual & Historical Pattern Analysis
        $userHabitBayWeights = self::computeUserHabitBayWeights($userId);
        
        $rollGrade = strtoupper(trim($roll->grade->grade ?? ($roll->grade ?? '')));
        $rollWeight = (int)($roll->weight ?? 900);
        $rollGsm = (int)($roll->gsm ?? 150);
        $rollJop = strtoupper(trim($roll->jop->jop ?? ($roll->jop ?? '')));
        $rollShift = $roll->shift->shift ?? ($roll->shift ?? '1');

        $candidates = [];

        // 2. Evaluate every available physical slot (12 Columns x 4 Tiers)
        for ($col = 1; $col <= 12; $col++) {
            for ($tier = 1; $tier <= 4; $tier++) {
                $slotInfo = $occupiedMap[$col][$tier] ?? null;
                if (!$slotInfo || $slotInfo['isOccupied']) {
                    continue;
                }

                // Check structural tier stacking constraint:
                // Tier N can only be filled if Tier N-1 below is occupied
                if ($tier > 1) {
                    $belowSlot = $occupiedMap[$col][$tier - 1] ?? null;
                    if (!$belowSlot || !$belowSlot['isOccupied']) {
                        continue; // Invalid slot: lower tier is empty
                    }
                }

                // Calculate multi-dimensional feature scores (0 - 100)
                $scoreBreakdown = self::scoreSlot(
                    $col,
                    $tier,
                    $slotInfo['id'],
                    $rollGrade,
                    $rollWeight,
                    $rollGsm,
                    $rollJop,
                    $columnGrades,
                    $columnJops,
                    $columnWeights,
                    $userHabitBayWeights,
                    $actionType,
                    $currentLocationId,
                    $locations
                );

                $candidates[] = [
                    'id' => $slotInfo['id'],
                    'code' => $slotInfo['code'],
                    'col' => $col,
                    'tier' => $tier,
                    'totalScore' => $scoreBreakdown['totalScore'],
                    'gradeScore' => $scoreBreakdown['gradeScore'],
                    'weightScore' => $scoreBreakdown['weightScore'],
                    'habitScore' => $scoreBreakdown['habitScore'],
                    'jopScore' => $scoreBreakdown['jopScore'],
                    'proximityScore' => $scoreBreakdown['proximityScore'],
                    'reasonings' => $scoreBreakdown['reasonings'],
                    'tag' => $scoreBreakdown['tag'],
                ];
            }
        }

        // Sort candidates by total score descending
        usort($candidates, fn($a, $b) => $b['totalScore'] <=> $a['totalScore']);

        if (empty($candidates)) {
            // Fallback: pick any available Tier 1 slot
            $fallback = Location::where('status', 0)->first();
            return [
                'recommendedSlot' => $fallback ? ['id' => $fallback->id, 'code' => $fallback->location] : null,
                'confidence' => 50.0,
                'reasonings' => ['Slot cadangan fondasi standar'],
                'topCandidates' => [],
                'featureWeights' => self::getFeatureWeights($actionType),
            ];
        }

        $top = $candidates[0];
        $confidence = min(99.4, max(75.0, round($top['totalScore'] * 0.98, 1)));

        return [
            'recommendedSlot' => [
                'id' => $top['id'],
                'code' => $top['code'],
                'col' => $top['col'],
                'tier' => $top['tier'],
            ],
            'confidence' => $confidence,
            'reasonings' => $top['reasonings'],
            'topCandidates' => array_slice($candidates, 0, 3),
            'featureWeights' => self::getFeatureWeights($actionType),
        ];
    }

    /**
     * Compute slot score based on physical characteristics and user habits
     */
    private static function scoreSlot(
        int $col,
        int $tier,
        int $slotId,
        string $grade,
        int $weight,
        int $gsm,
        string $jop,
        array $columnGrades,
        array $columnJops,
        array $columnWeights,
        array $userHabitBayWeights,
        string $actionType,
        ?int $currentLocationId,
        $allLocations
    ): array {
        $reasonings = [];
        $tags = [];

        // 1. Grade Clustering Score (0 - 100)
        $gradeScore = 50.0;
        $existingGradesInCol = $columnGrades[$col] ?? [];
        if (!empty($existingGradesInCol)) {
            if (in_array($grade, $existingGradesInCol)) {
                $gradeScore = 100.0;
                $reasonings[] = "Klaster Grade sejenis: Kolom " . sprintf('%02d', $col) . " telah terisi " . $grade;
                $tags[] = "Cluster " . $grade;
            } else {
                $gradeScore = 20.0; // Penalty for mixing different grades in same bay stack
            }
        } else {
            // Empty column, check adjacent columns
            $leftGrades = $columnGrades[$col - 1] ?? [];
            $rightGrades = $columnGrades[$col + 1] ?? [];
            if (in_array($grade, $leftGrades) || in_array($grade, $rightGrades)) {
                $gradeScore = 85.0;
                $reasonings[] = "Zona Grade berdekatan: Berdampingan dengan area " . $grade;
            } else {
                $gradeScore = 65.0;
            }
        }

        // 2. Weight & Structural Safety Score (0 - 100)
        $weightScore = 70.0;
        if ($tier === 1) {
            if ($weight >= 900) {
                $weightScore = 100.0;
                $reasonings[] = "Stabilitas Fondasi: Beban berat ({$weight} kg) optimal di Tier 1 (Lantai dasar)";
                $tags[] = "Fondasi Berat Tier 1";
            } elseif ($weight >= 700) {
                $weightScore = 85.0;
            } else {
                $weightScore = 60.0; // Lightweight on tier 1 is okay but higher tier is preferred
            }
        } elseif ($tier === 2) {
            if ($weight >= 600 && $weight <= 950) {
                $weightScore = 95.0;
                $reasonings[] = "Keseimbangan Beban: Tier 2 stabil untuk berat sedang ({$weight} kg)";
            } else {
                $weightScore = 75.0;
            }
        } elseif ($tier >= 3) {
            if ($weight < 750) {
                $weightScore = 95.0;
                $reasonings[] = "Keamanan Penumpukan: Roll ringan ({$weight} kg) aman di Tier {$tier}";
                $tags[] = "Stack Aman Tier {$tier}";
            } else {
                $weightScore = 35.0; // Penalty: Heavy rolls on high tiers pose structural risk
            }
        }

        // 3. JOP / Customer Batching Score (0 - 100)
        $jopScore = 50.0;
        if ($jop) {
            $existingJopsInCol = $columnJops[$col] ?? [];
            if (in_array($jop, $existingJopsInCol)) {
                $jopScore = 100.0;
                $reasonings[] = "Sinkronisasi Order JOP: Mengelompokkan pesanan {$jop} untuk kemudahan dispatching";
                $tags[] = "Batch {$jop}";
            } elseif (in_array($jop, $columnJops[$col - 1] ?? []) || in_array($jop, $columnJops[$col + 1] ?? [])) {
                $jopScore = 80.0;
            }
        }

        // 4. Operator Habitual & Learning Pattern Score (0 - 100)
        $habitScore = 50.0;
        if (isset($userHabitBayWeights[$col])) {
            $freq = $userHabitBayWeights[$col]; // 0.0 - 1.0
            $habitScore = round(40.0 + ($freq * 60.0), 1);
            if ($freq > 0.15) {
                $reasonings[] = "Pola Kebiasaan Operator: Kolom " . sprintf('%02d', $col) . " merupakan preferensi historis penempatan";
                $tags[] = "Pola Operator";
            }
        }

        // 5. Move Proximity & Consolidation Score (0 - 100)
        $proximityScore = 80.0;
        if ($actionType === 'MOVE' && $currentLocationId) {
            $currentLoc = $allLocations->firstWhere('id', $currentLocationId);
            if ($currentLoc) {
                $curParts = explode('-', $currentLoc->location);
                if (count($curParts) === 3) {
                    $curCol = (int)$curParts[1];
                    $dist = abs($col - $curCol);
                    $proximityScore = max(20.0, 100.0 - ($dist * 12.0));
                    if ($dist <= 2) {
                        $reasonings[] = "Efisiensi Jarak: Relokasi ergonomis dekat posisi asal ({$currentLoc->location})";
                        $tags[] = "Jarak Optimal";
                    }
                }
            }
        }

        // Compute Weighted Sum
        $weights = self::getFeatureWeights($actionType);
        $totalScore = (
            ($gradeScore * $weights['grade']) +
            ($weightScore * $weights['weight']) +
            ($habitScore * $weights['habit']) +
            ($jopScore * $weights['jop']) +
            ($proximityScore * $weights['proximity'])
        );

        $primaryTag = !empty($tags) ? $tags[0] : 'Rekomendasi SPECTRUM';

        return [
            'totalScore' => round($totalScore, 1),
            'gradeScore' => round($gradeScore, 1),
            'weightScore' => round($weightScore, 1),
            'habitScore' => round($habitScore, 1),
            'jopScore' => round($jopScore, 1),
            'proximityScore' => round($proximityScore, 1),
            'reasonings' => array_slice(array_unique($reasonings), 0, 4),
            'tag' => $primaryTag,
        ];
    }

    /**
     * Feature weights configured per action type
     */
    public static function getFeatureWeights(string $actionType = 'ASSIGN'): array
    {
        if ($actionType === 'MOVE') {
            return [
                'grade' => 0.25,
                'weight' => 0.20,
                'habit' => 0.20,
                'jop' => 0.15,
                'proximity' => 0.20,
            ];
        }

        return [
            'grade' => 0.30,
            'weight' => 0.25,
            'habit' => 0.25,
            'jop' => 0.15,
            'proximity' => 0.05,
        ];
    }

    /**
     * Compute historical bay frequency distribution for a specific operator
     */
    private static function computeUserHabitBayWeights(?int $userId): array
    {
        $distribution = array_fill(1, 12, 0.08); // Baseline uniform prior

        if (!$userId) {
            return $distribution;
        }

        // Query user's past chosen locations from recommendation logs and roll assignments
        $logs = LocationRecommendationLog::where('users_id', $userId)
            ->with('selectedLocation')
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get();

        if ($logs->isEmpty()) {
            // Also check rolls created by this user
            $rolls = Roll::where('users_id', $userId)
                ->with('location')
                ->whereNotNull('locations_id')
                ->limit(100)
                ->get();

            $colCounts = [];
            $total = 0;
            foreach ($rolls as $r) {
                if ($r->location) {
                    $parts = explode('-', $r->location->location);
                    if (count($parts) === 3) {
                        $c = (int)$parts[1];
                        $colCounts[$c] = ($colCounts[$c] ?? 0) + 1;
                        $total++;
                    }
                }
            }

            if ($total > 0) {
                foreach ($colCounts as $c => $cnt) {
                    $distribution[$c] = round($cnt / $total, 3);
                }
            }

            return $distribution;
        }

        $colCounts = [];
        $total = 0;
        foreach ($logs as $log) {
            if ($log->selectedLocation) {
                $parts = explode('-', $log->selectedLocation->location);
                if (count($parts) === 3) {
                    $c = (int)$parts[1];
                    $colCounts[$c] = ($colCounts[$c] ?? 0) + 1;
                    $total++;
                }
            }
        }

        if ($total > 0) {
            foreach ($colCounts as $c => $cnt) {
                $distribution[$c] = round($cnt / $total, 3);
            }
        }

        return $distribution;
    }
}
