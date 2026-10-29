<?php

namespace App\Services\AI;

class SlotFeatureExtractor
{
    /**
     * Feature indices definition for LightGBMSlotRanker:
     * 0: norm_weight         (float 0.0 - 1.0, normalized from 300kg - 2500kg)
     * 1: norm_gsm            (float 0.0 - 1.0, normalized from 50 - 450 gsm)
     * 2: col_idx             (int 1 - 12)
     * 3: tier_idx            (int 1 - 4)
     * 4: grade_affinity      (float 0.0 - 1.0, column & adjacent grade matching)
     * 5: jop_affinity        (float 0.0 - 1.0, column & adjacent JOP order matching)
     * 6: structural_safety   (float 0.0 - 1.0, load balance & tier stability)
     * 7: operator_habit      (float 0.0 - 1.0, Bayesian frequency prior)
     * 8: proximity_factor    (float 0.0 - 1.0, distance efficiency for moves)
     * 9: col_density         (float 0.0 - 1.0, ratio of occupied slots in column)
     */
    public const FEATURE_NAMES = [
        'norm_weight',
        'norm_gsm',
        'col_idx',
        'tier_idx',
        'grade_affinity',
        'jop_affinity',
        'structural_safety',
        'operator_habit',
        'proximity_factor',
        'col_density',
    ];

    /**
     * Extract normalized feature vector from roll parameters and candidate slot context
     */
    public static function extract(
        int $col,
        int $tier,
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
        array $occupiedMap
    ): array {
        // 0. Normalized Weight (300kg -> 0.0, 2500kg -> 1.0)
        $normWeight = max(0.0, min(1.0, ($weight - 300) / 2200.0));

        // 1. Normalized GSM (50 -> 0.0, 450 -> 1.0)
        $normGsm = max(0.0, min(1.0, ($gsm - 50) / 400.0));

        // 2 & 3: Col & Tier
        $colIdx = (float)$col;
        $tierIdx = (float)$tier;

        // 4. Grade Affinity
        $existingGrades = $columnGrades[$col] ?? [];
        if (!empty($existingGrades)) {
            if (in_array($grade, $existingGrades)) {
                $gradeAffinity = 1.0; // Perfect co-location
            } else {
                $gradeAffinity = 0.2; // Mixed grades penalty
            }
        } else {
            $leftGrades = $columnGrades[$col - 1] ?? [];
            $rightGrades = $columnGrades[$col + 1] ?? [];
            if (in_array($grade, $leftGrades) || in_array($grade, $rightGrades)) {
                $gradeAffinity = 0.85; // Adjacent bay cluster
            } else {
                $gradeAffinity = 0.60; // Clean empty bay
            }
        }

        // 5. JOP Batch Affinity
        $jopAffinity = 0.50;
        if (!empty($jop)) {
            $existingJops = $columnJops[$col] ?? [];
            if (in_array($jop, $existingJops)) {
                $jopAffinity = 1.0; // Same production order
            } elseif (in_array($jop, $columnJops[$col - 1] ?? []) || in_array($jop, $columnJops[$col + 1] ?? [])) {
                $jopAffinity = 0.80; // Nearby JOP bay
            } else {
                $jopAffinity = 0.30;
            }
        }

        // 6. Structural & Load Stability Safety
        $safety = 0.70;
        if ($tier === 1) {
            // Tier 1 (Ground level) is optimal for heavy rolls
            if ($weight >= 900) {
                $safety = 1.0;
            } elseif ($weight >= 700) {
                $safety = 0.85;
            } else {
                $safety = 0.65;
            }
        } elseif ($tier === 2) {
            // Tier 2 supports medium to high loads
            if ($weight >= 600 && $weight <= 1000) {
                $safety = 0.95;
            } elseif ($weight > 1000) {
                $safety = 0.70;
            } else {
                $safety = 0.80;
            }
        } elseif ($tier >= 3) {
            // Tier 3 and 4 should carry lighter rolls
            if ($weight < 750) {
                $safety = 0.95;
            } elseif ($weight <= 900) {
                $safety = 0.60;
            } else {
                $safety = 0.20; // Severe risk: Heavy roll placed high up
            }
        }

        // 7. Operator Habit Bayesian Prior
        $habitPrior = $userHabitBayWeights[$col] ?? 0.083; // Baseline uniform 1/12

        // 8. Move Proximity Factor
        $proximity = 0.80;
        if ($actionType === 'MOVE' && $currentLocationId && $allLocations) {
            $curLoc = $allLocations->firstWhere('id', $currentLocationId);
            if ($curLoc) {
                $curParts = explode('-', $curLoc->location);
                if (count($curParts) === 3) {
                    $curCol = (int)$curParts[1];
                    $dist = abs($col - $curCol);
                    $proximity = max(0.10, 1.0 - ($dist * 0.12));
                }
            }
        }

        // 9. Column Density (How full is this column: 0/4 to 3/4)
        $occupiedCount = 0;
        for ($t = 1; $t <= 4; $t++) {
            if (!empty($occupiedMap[$col][$t]['isOccupied'])) {
                $occupiedCount++;
            }
        }
        $density = $occupiedCount / 4.0;

        return [
            $normWeight,        // 0
            $normGsm,           // 1
            $colIdx,            // 2
            $tierIdx,           // 3
            $gradeAffinity,     // 4
            $jopAffinity,       // 5
            $safety,            // 6
            $habitPrior,        // 7
            $proximity,         // 8
            $density,           // 9
        ];
    }
}

