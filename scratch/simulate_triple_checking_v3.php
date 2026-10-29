<?php
/**
 * Triple Checking Protocol Simulation & Benchmark (Zone-Aware Consolidation)
 */

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\AI\LightGBMSlotRanker;
use App\Models\Location;

$jsonFile = __DIR__ . '/../storage/app/real_fg_july2026.json';
$allRolls = json_decode(file_get_contents($jsonFile), true);
$totalRollsInDataset = count($allRolls);

echo "=== ROLLYN SPECTRUM AI: TRIPLE CHECKING PROTOCOL (v3) ===\n";
echo "Dataset: 07. Database Report FG Juli 26.xlsx\n";
echo "Total Production Rolls Loaded: {$totalRollsInDataset}\n\n";

$dbLocations = Location::all();
echo "Total Physical Warehouse Locations: " . $dbLocations->count() . "\n";

$warehouseState = [];
$rackSlots = [];
$zoneRacks = [
    'E' => ['E17','E16','E15','E14','E13','E12','E11','E10','E9','E8','E7','E6','E5','E4','E3','E2'],
    'A' => ['A17','A15','A13','A12','A11','A10','A9','A8','A7','A6','A5','A3','A2','A1'],
    'G' => ['G12','G11','G10','G9','G8','G7','G6','G5','G4','G3','G2','G1'],
    'B' => ['B33','B32','B31','B30','B29','B28','B27','B26','B25','B24','B23','B22','B18','B17','B16','B15','B14','B13','B12','B11','B10','B9','B8','B7','B6','B5','B4','B3','B2','B1'],
];

foreach ($dbLocations as $loc) {
    $code = $loc->location;
    $parts = explode('-', $code);
    $rack = $parts[0];
    $col = isset($parts[1]) ? (int)$parts[1] : 1;
    $row = isset($parts[2]) ? (int)$parts[2] : 1;
    $zone = substr($rack, 0, 1);
    
    $slotData = [
        'id' => $loc->id,
        'code' => $code,
        'rack' => $rack,
        'zone' => $zone,
        'col' => $col,
        'row' => $row,
        'rolls' => [],
    ];
    $warehouseState[$loc->id] = $slotData;
    $rackSlots[$rack][] = $loc->id;
}

$simulationCount = 1000;
$testRolls = array_slice($allRolls, 0, $simulationCount);

echo "Starting Simulation of {$simulationCount} Sequential Roll Arrivals...\n";

$latencies = [];
$safetyViolations = [];
$tierDistribution = [1 => 0, 2 => 0, 3 => 0, 4 => 0];
$allocations = [];
$jopActiveZones = [];
$jopActiveRacks = [];

$startTime = microtime(true);

foreach ($testRolls as $idx => $roll) {
    $rStart = microtime(true);
    
    $rollWeight = (float)$roll['weight'];
    $rollGrade = strtoupper(trim($roll['grade']));
    $rollGsm = (int)$roll['gsm'];
    $rollJop = strtoupper(trim($roll['jop']));
    
    $evalCandidate = function($locId) use (&$warehouseState, $rollWeight, $rollGrade, $rollGsm, $rollJop, &$jopActiveZones, &$jopActiveRacks) {
        $slot = $warehouseState[$locId];
        $curStack = count($slot['rolls']);
        if ($curStack >= 4) return null;
        
        $candidateTier = $curStack + 1;
        
        // Zero-tolerance safety: >= 1000kg cannot go to Tier 3 or 4
        if ($rollWeight >= 1000 && $candidateTier >= 3) {
            return null;
        }
        
        // Inverted pyramid safety
        if ($candidateTier > 1) {
            $underRoll = end($slot['rolls']);
            if ($underRoll && ($rollWeight - $underRoll['weight']) > 100) {
                return null;
            }
        }
        
        $slotGrades = array_map(fn($r) => $r['grade'], $slot['rolls']);
        $slotJops = array_map(fn($r) => $r['jop'], $slot['rolls']);
        
        // Grade affinity
        $gradeAffinity = 0.60;
        if (!empty($slotGrades)) {
            $gradeAffinity = in_array($rollGrade, $slotGrades) ? 1.0 : 0.20;
        }
        
        // JOP affinity
        $jopAffinity = 0.50;
        if ($rollJop) {
            if (in_array($rollJop, $slotJops)) {
                $jopAffinity = 1.0;
            } elseif (isset($jopActiveRacks[$rollJop]) && in_array($slot['rack'], $jopActiveRacks[$rollJop])) {
                $jopAffinity = 0.95; // Same rack
            } elseif (isset($jopActiveZones[$rollJop]) && $slot['zone'] === $jopActiveZones[$rollJop]) {
                $jopAffinity = 0.85; // Same warehouse zone/aisle
            } else {
                $jopAffinity = 0.30;
            }
        }
        
        // Safety
        $safety = 0.70;
        if ($candidateTier === 1) {
            $safety = ($rollWeight >= 900) ? 1.0 : 0.85;
        } elseif ($candidateTier === 2) {
            $safety = ($rollWeight <= 1000) ? 0.95 : 0.65;
        } elseif ($candidateTier >= 3) {
            $safety = ($rollWeight < 750) ? 0.95 : 0.10;
        }
        
        $normWeight = max(0.0, min(1.0, ($rollWeight - 300) / 2200.0));
        $normGsm = max(0.0, min(1.0, ($rollGsm - 50) / 400.0));
        $colIdx = (float)$slot['col'];
        $tierIdx = (float)$candidateTier;
        $habitPrior = ($slot['zone'] === 'E' || $slot['zone'] === 'A') ? 0.25 : 0.08;
        $density = $curStack / 4.0;
        
        $features = [
            $normWeight,
            $normGsm,
            $colIdx,
            $tierIdx,
            $gradeAffinity,
            $jopAffinity,
            $safety,
            $habitPrior,
            0.80,
            $density,
        ];
        
        $pred = LightGBMSlotRanker::predict($features);
        $score = $pred['score'];
        
        if ($jopAffinity >= 0.95) $score += 40.0;
        elseif ($jopAffinity >= 0.85) $score += 25.0;
        
        if ($gradeAffinity >= 0.95) $score += 15.0;
        if ($rollWeight >= 1000 && $candidateTier === 1) $score += 20.0;
        
        return [
            'id' => $locId,
            'code' => $slot['code'],
            'rack' => $slot['rack'],
            'zone' => $slot['zone'],
            'tier' => $candidateTier,
            'score' => $score,
            'jopAffinity' => $jopAffinity,
        ];
    };
    
    $candidates = [];
    
    // 1. Try JOP active racks first
    if ($rollJop && isset($jopActiveRacks[$rollJop])) {
        foreach ($jopActiveRacks[$rollJop] as $activeRack) {
            foreach ($rackSlots[$activeRack] ?? [] as $sid) {
                $cand = $evalCandidate($sid);
                if ($cand) {
                    $candidates[] = $cand;
                    if ($cand['jopAffinity'] >= 0.95 && $cand['score'] >= 140.0) {
                        break 2;
                    }
                }
            }
        }
    }
    
    // 2. Try JOP active zone (adjacent racks in the same aisle)
    if (empty($candidates) && $rollJop && isset($jopActiveZones[$rollJop])) {
        $activeZone = $jopActiveZones[$rollJop];
        foreach ($zoneRacks[$activeZone] ?? [] as $zRack) {
            foreach ($rackSlots[$zRack] ?? [] as $sid) {
                $cand = $evalCandidate($sid);
                if ($cand) {
                    $candidates[] = $cand;
                    if ($cand['score'] >= 130.0) {
                        break 2;
                    }
                }
            }
        }
    }
    
    // 3. Fallback to all warehouse slots
    if (empty($candidates)) {
        // Prefer Area E and Area A first (loading dock access)
        foreach (['E', 'A', 'G', 'B', 'C', 'H'] as $prefZone) {
            foreach ($zoneRacks[$prefZone] ?? [] as $zRack) {
                foreach ($rackSlots[$zRack] ?? [] as $sid) {
                    $cand = $evalCandidate($sid);
                    if ($cand) {
                        $candidates[] = $cand;
                        if ($cand['score'] >= 120.0) {
                            break 3;
                        }
                    }
                }
            }
        }
    }
    
    usort($candidates, fn($a, $b) => $b['score'] <=> $a['score']);
    $bestSlot = $candidates[0];
    
    $rDur = (microtime(true) - $rStart) * 1000;
    $latencies[] = $rDur;
    
    $chosenId = $bestSlot['id'];
    $chosenTier = $bestSlot['tier'];
    $chosenRack = $bestSlot['rack'];
    $chosenZone = $bestSlot['zone'];
    
    $warehouseState[$chosenId]['rolls'][] = [
        'no_roll' => $roll['no_roll'],
        'weight' => $rollWeight,
        'grade' => $rollGrade,
        'jop' => $rollJop,
        'tier' => $chosenTier,
    ];
    
    $tierDistribution[$chosenTier]++;
    
    if ($rollJop) {
        if (!isset($jopActiveZones[$rollJop])) {
            $jopActiveZones[$rollJop] = $chosenZone;
        }
        if (!isset($jopActiveRacks[$rollJop])) {
            $jopActiveRacks[$rollJop] = [];
        }
        if (!in_array($chosenRack, $jopActiveRacks[$rollJop])) {
            $jopActiveRacks[$rollJop][] = $chosenRack;
        }
    }
    
    // Safety check 1
    if ($rollWeight >= 1000 && $chosenTier >= 3) {
        $safetyViolations[] = [
            'roll' => $roll['no_roll'],
            'weight' => $rollWeight,
            'tier' => $chosenTier,
            'reason' => "CRITICAL: Roll >= 1000kg placed on Tier {$chosenTier}",
        ];
    }
    
    // Safety check 2
    if ($chosenTier > 1) {
        $slotRolls = $warehouseState[$chosenId]['rolls'];
        $underRoll = $slotRolls[count($slotRolls) - 2];
        if ($rollWeight - $underRoll['weight'] > 100) {
            $safetyViolations[] = [
                'roll' => $roll['no_roll'],
                'weight' => $rollWeight,
                'tier' => $chosenTier,
                'reason' => "CRITICAL: Inverted pyramid weight hazard",
            ];
        }
    }
    
    $allocations[] = [
        'no_roll' => $roll['no_roll'],
        'weight' => $rollWeight,
        'grade' => $rollGrade,
        'jop' => $rollJop,
        'slot' => $bestSlot['code'],
        'rack' => $chosenRack,
        'zone' => $chosenZone,
        'tier' => $chosenTier,
    ];
}

$totalTime = (microtime(true) - $startTime) * 1000;

echo "\n--- PROTOCOL AUDIT RESULTS ---\n";
echo "Total Sequential Decisions Made: " . count($allocations) . "\n";
echo "Total Simulation Wall Time: " . round($totalTime, 2) . " ms (" . round($totalTime / 1000, 2) . " s)\n\n";

// 1. Throughput & Latency
sort($latencies);
$avgLatency = array_sum($latencies) / count($latencies);
$p50 = $latencies[(int)(count($latencies) * 0.50)];
$p95 = $latencies[(int)(count($latencies) * 0.95)];
$p99 = $latencies[(int)(count($latencies) * 0.99)];
$maxLatency = end($latencies);

echo "[TEST 5: THROUGHPUT & LATENCY BENCHMARK]\n";
echo "  Average Latency : " . round($avgLatency, 3) . " ms / decision\n";
echo "  Median (p50)    : " . round($p50, 3) . " ms\n";
echo "  95th Percentile : " . round($p95, 3) . " ms\n";
echo "  99th Percentile : " . round($p99, 3) . " ms\n";
echo "  Max Latency     : " . round($maxLatency, 3) . " ms\n";
echo "  Throughput Rate : " . round(1000 / $avgLatency, 1) . " roll decisions / second\n";
echo "  Target (< 1.0ms): " . ($avgLatency < 1.0 ? "PASSED (PERFECT)" : "ACCEPTABLE") . "\n\n";

// 2. Gravitational Safety Audit
echo "[TEST 2: ZERO-TOLERANCE GRAVITY SAFETY AUDIT]\n";
echo "  Tier Distribution:\n";
echo "    Tier 1 (Ground)   : {$tierDistribution[1]} rolls (" . round(($tierDistribution[1]/$simulationCount)*100, 1) . "%)\n";
echo "    Tier 2 (Middle)   : {$tierDistribution[2]} rolls (" . round(($tierDistribution[2]/$simulationCount)*100, 1) . "%)\n";
echo "    Tier 3 (Upper)    : {$tierDistribution[3]} rolls (" . round(($tierDistribution[3]/$simulationCount)*100, 1) . "%)\n";
echo "    Tier 4 (Top)      : {$tierDistribution[4]} rolls (" . round(($tierDistribution[4]/$simulationCount)*100, 1) . "%)\n";
echo "  Total Violations    : " . count($safetyViolations) . "\n";
$safetyCompliance = (1 - (count($safetyViolations) / $simulationCount)) * 100;
echo "  Safety Compliance   : " . number_format($safetyCompliance, 2) . "%\n";
echo "  Target (100% Strict): " . (count($safetyViolations) === 0 ? "PASSED (100% ZERO-TOLERANCE COMPLIANT)" : "FAILED") . "\n\n";

// 3. JOP Batch Consolidation Rate (Zone & Adjacent Aisle)
echo "[TEST 3: JOP BATCH CONSOLIDATION RATE]\n";
$multiRollJops = 0;
$consolidatedZoneRolls = 0;

$jopsGrouped = [];
foreach ($allocations as $a) {
    if ($a['jop']) {
        $jopsGrouped[$a['jop']][] = $a['zone'];
    }
}

foreach ($jopsGrouped as $jopCode => $zones) {
    if (count($zones) > 1) {
        $multiRollJops += count($zones);
        $counts = array_count_values($zones);
        $maxCount = max($counts);
        $consolidatedZoneRolls += $maxCount;
    }
}

$consolidationRate = $multiRollJops > 0 ? ($consolidatedZoneRolls / $multiRollJops) * 100 : 100;
echo "  Multi-roll JOP items: {$multiRollJops}\n";
echo "  Consolidated in Target Aisle/Zone: {$consolidatedZoneRolls}\n";
echo "  Consolidation Rate  : " . round($consolidationRate, 1) . "%\n";
echo "  Target (>= 85%)     : " . ($consolidationRate >= 85.0 ? "PASSED (TARGET ACHIEVED: >= 85%)" : "NEEDS TUNING") . "\n\n";

// 4. Comparison with Operator's Actual Warehouse Placement
echo "[OPERATOR BENCHMARK: COMPARISON WITH ACTUAL FACTORY PLACEMENT]\n";
$operatorMatches = 0;
$totalComparable = 0;
foreach ($allocations as $idx => $a) {
    $realRoll = $testRolls[$idx];
    $actualLoc = $realRoll['lokasi_actual'] ?? '';
    if (!empty($actualLoc)) {
        $totalComparable++;
        $actualPrefix = substr($actualLoc, 0, 1);
        if ($actualPrefix === $a['zone']) {
            $operatorMatches++;
        }
    }
}
$operatorMatchRate = $totalComparable > 0 ? ($operatorMatches / $totalComparable) * 100 : 0;
echo "  Comparable Rolls with Actual Factory Logs: {$totalComparable}\n";
echo "  Matching Warehouse Zone with Human Operator: {$operatorMatches}\n";
echo "  Human Operator Alignment Rate: " . round($operatorMatchRate, 1) . "%\n\n";

echo "=== END OF PROTOCOL SIMULATION ===\n";

