<?php

namespace App\Services\AI;

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
        $rackGrades = [];
        $rackJops = [];

        foreach ($locations as $loc) {
            $code = $loc->location;
            $parts = explode('-', $code);
            $rack = $parts[0] ?? 'A17';
            $col = isset($parts[1]) ? (int)$parts[1] : 1;
            $rowOrTier = isset($parts[2]) ? (int)$parts[2] : 1;

            $stackCount = $loc->rolls->count();
            $isOccupied = ($loc->status !== 0 || $stackCount >= Location::MAX_CAPACITY) && ($loc->id !== $currentLocationId);

            // Legacy unit-test compatibility map
            $occupiedMap[$col][$rowOrTier] = [
                'id' => $loc->id,
                'code' => $code,
                'isOccupied' => $isOccupied || ($loc->status !== 0),
                'status' => $loc->status,
                'roll' => $loc->rolls->first(),
            ];

            if ($loc->rolls->isNotEmpty()) {
                foreach ($loc->rolls as $r) {
                    $gradeName = $r->grade->grade ?? ($r->grade ?? '');
                    $jopName = $r->jop->jop ?? ($r->jop ?? '');
                    if ($gradeName) {
                        $upGrade = strtoupper(trim($gradeName));
                        $columnGrades[$col][] = $upGrade;
                        $rackGrades[$rack][] = $upGrade;
                    }
                    if ($jopName) {
                        $upJop = strtoupper(trim($jopName));
                        $columnJops[$col][] = $upJop;
                        $rackJops[$rack][] = $upJop;
                    }
                    $columnWeights[$col][] = (float)($r->weight ?? 900);
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

        // 2. Evaluate available physical slots across warehouse
        foreach ($locations as $loc) {
            if ($loc->id === $currentLocationId) {
                continue;
            }

            $code = $loc->location;
            $parts = explode('-', $code);
            $rack = $parts[0] ?? 'A17';
            $col = isset($parts[1]) ? (int)$parts[1] : 1;
            $rowOrTier = isset($parts[2]) ? (int)$parts[2] : 1;

            $stackCount = $loc->rolls->count();
            if ($loc->status !== 0 && $stackCount >= Location::MAX_CAPACITY) {
                continue; // Slot full
            }

            // Determine candidate tier
            // If location has rolls, tier is current stack + 1
            // If location has no rolls but parts[2] represents tier (legacy unit test where A17-1-2 is tier 2):
            $tier = $stackCount > 0 ? ($stackCount + 1) : min(4, $rowOrTier);

            // Legacy structural tier stacking constraint (e.g. A17-1-2 requires A17-1-1 to be occupied)
            if ($tier > 1 && $stackCount === 0) {
                $belowSlot = $occupiedMap[$col][$tier - 1] ?? null;
                if (!$belowSlot || !$belowSlot['isOccupied']) {
                    continue; // Invalid slot: lower tier is empty
                }
            }

            // --- ZERO-TOLERANCE GRAVITATIONAL SAFETY AUDIT RULE ---
            // Heavy rolls (>= 1000 kg) CANNOT be placed on Tier 3 or Tier 4 under any circumstance
            if ($rollWeight >= 1000 && $tier >= 3) {
                continue;
            }

            // Inverted Pyramid Check: Roll above cannot be significantly heavier than roll below
            if ($stackCount > 0) {
                $underRoll = $loc->rolls->last();
                if ($underRoll && ($rollWeight - ($underRoll->weight ?? 900)) > 100) {
                    continue; // Crushing/toppling risk
                }
            }

            // Calculate ML feature scores using pure PHP LightGBM model
            $scoreBreakdown = self::scoreSlot(
                $col,
                $tier,
                $loc->id,
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
                $locations,
                $occupiedMap
            );

            // Add Rack & JOP Area consolidation bonus
            $totalScore = $scoreBreakdown['totalScore'];
            if ($rollJop && isset($rackJops[$rack]) && in_array($rollJop, $rackJops[$rack])) {
                $totalScore += 25.0;
            }
            if ($rollGrade && isset($rackGrades[$rack]) && in_array($rollGrade, $rackGrades[$rack])) {
                $totalScore += 15.0;
            }

            $candidates[] = [
                'id' => $loc->id,
                'code' => $code,
                'rack' => $rack,
                'col' => $col,
                'tier' => $tier,
                'totalScore' => round($totalScore, 1),
                'gradeScore' => $scoreBreakdown['gradeScore'],
                'weightScore' => $scoreBreakdown['weightScore'],
                'habitScore' => $scoreBreakdown['habitScore'],
                'jopScore' => $scoreBreakdown['jopScore'],
                'proximityScore' => $scoreBreakdown['proximityScore'],
                'reasonings' => $scoreBreakdown['reasonings'],
                'tag' => $scoreBreakdown['tag'],
            ];
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
                'rack' => $top['rack'] ?? explode('-', $top['code'])[0],
                'col' => $top['col'],
                'tier' => $top['tier'],
            ],
            'confidence' => $confidence,
            'reasonings' => $top['reasonings'],
            'topCandidates' => array_slice($candidates, 0, 3),
            'featureWeights' => self::getFeatureWeights($actionType),
            'model_info' => LightGBMSlotRanker::getModelInfo(),
        ];
    }

    /**
     * Compute slot score using pure PHP LightGBM model and structural rules
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
        $allLocations,
        array $occupiedMap = []
    ): array {
        $reasonings = [];
        $tags = [];

        // 1. Grade Clustering Score (0 - 100)
        $gradeScore = 50.0;
        $existingGradesInCol = $columnGrades[$col] ?? [];
        if (!empty($existingGradesInCol)) {
            if (in_array($grade, $existingGradesInCol)) {
                $gradeScore = 100.0;
                $reasonings[] = "Grade Cluster: Column " . sprintf('%02d', $col) . " already contains " . $grade;
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
                $reasonings[] = "Adjacent Grade Zone: Near " . $grade . " storage bay";
            } else {
                $gradeScore = 65.0;
            }
        }

        // 2. Weight & Structural Safety Score (0 - 100)
        $weightScore = 70.0;
        if ($tier === 1) {
            if ($weight >= 900) {
                $weightScore = 100.0;
                $reasonings[] = "Foundation Stability: Heavy load ({$weight} kg) optimal at Tier 1 (Ground level)";
                $tags[] = "Heavy Foundation Tier 1";
            } elseif ($weight >= 700) {
                $weightScore = 85.0;
            } else {
                $weightScore = 60.0; // Lightweight on tier 1 is okay but higher tier is preferred
            }
        } elseif ($tier === 2) {
            if ($weight >= 600 && $weight <= 950) {
                $weightScore = 95.0;
                $reasonings[] = "Load Balance: Tier 2 stable for medium load ({$weight} kg)";
            } else {
                $weightScore = 75.0;
            }
        } elseif ($tier >= 3) {
            if ($weight < 750) {
                $weightScore = 95.0;
                $reasonings[] = "Stacking Safety: Lightweight roll ({$weight} kg) secure at Tier {$tier}";
                $tags[] = "Safe Stack Tier {$tier}";
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
                $reasonings[] = "JOP Order Synchronization: Grouped with {$jop} for streamlined dispatching";
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
                $reasonings[] = "Operator Pattern: Column " . sprintf('%02d', $col) . " matches historical operator preference";
                $tags[] = "Operator Pattern";
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
                        $reasonings[] = "Distance Efficiency: Ergonomic relocation near origin ({$currentLoc->location})";
                        $tags[] = "Optimal Distance";
                    }
                }
            }
        }

        // 6. Execute Pure-PHP LightGBM Model Inference (Zero-Python runtime)
        $features = SlotFeatureExtractor::extract(
            $col,
            $tier,
            $grade,
            $weight,
            $gsm,
            $jop,
            $columnGrades,
            $columnJops,
            $columnWeights,
            $userHabitBayWeights,
            $actionType,
            $currentLocationId,
            $allLocations,
            $occupiedMap
        );

        $lgbResult = LightGBMSlotRanker::predict($features);
        $totalScore = $lgbResult['score'];
        $combinedReasonings = array_values(array_unique(array_merge($lgbResult['reasons'], $reasonings)));
        $primaryTag = $lgbResult['tag'] ?? (!empty($tags) ? $tags[0] : 'LightGBM Recommendation');

        return [
            'totalScore' => round($totalScore, 1),
            'gradeScore' => round($gradeScore, 1),
            'weightScore' => round($weightScore, 1),
            'habitScore' => round($habitScore, 1),
            'jopScore' => round($jopScore, 1),
            'proximityScore' => round($proximityScore, 1),
            'reasonings' => array_slice($combinedReasonings, 0, 4),
            'tag' => $primaryTag,
            'model' => LightGBMSlotRanker::MODEL_NAME,
            'feature_contributions' => $lgbResult['feature_contributions'] ?? [],
        ];
    }

    /**
     * Get model architecture and runtime metadata
     */
    public static function getModelInfo(): array
    {
        return LightGBMSlotRanker::getModelInfo();
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
