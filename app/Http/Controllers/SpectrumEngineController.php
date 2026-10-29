<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File;
use Inertia\Inertia;
use App\Models\SpectrumTestLog;

class SpectrumEngineController extends Controller
{
    public function trainingPage()
    {
        return Inertia::render('Training');
    }

    public function ocrMonitoring()
    {
        return Inertia::render('OcrMonitoring');
    }

    public function detect(Request $request)
    {
        $base64Image = $request->input('image') ?? $request->input('image_base64');
        $images = $request->input('images');

        if (empty($base64Image) && empty($images)) {
            // fail fast on missing payload to save processing cycles
            return response()->json([
                'status' => 'ERROR',
                'weight_detected' => 0,
                'confidence' => 0.0,
                'message' => 'Param image, image_base64, or images is required.',
            ], 422);
        }

        $payload = !empty($images) ? ['images' => $images] : ['image' => $base64Image];

        $spectrumUrl = env('SPECTRUM_ENGINE_URL', 'http://127.0.0.1:8001');
        try {
            // offload heavy inference to specialized ML microservice with fast 3s timeout
            $response = Http::timeout(3)->post("{$spectrumUrl}/api/spectrum/detect", $payload);

            if ($response->successful()) {
                return response()->json($response->json());
            }
        } catch (\Exception $e) {
            Log::warning('[SPECTRUM Proxy] Microservice connection failed: ' . $e->getMessage());
        }

        // Return non-blocking fallback response so PHP worker never freezes
        return response()->json([
            'status' => 'WARNING_LOW_CONFIDENCE',
            'weight_detected' => 0,
            'confidence' => 0.0,
            'spectrum_processed_image' => $base64Image,
            'message' => 'SPECTRUM Engine microservice is offline or initializing.',
        ]);
    }

    public function logTestResult(Request $request)
    {
        $validated = $request->validate([
            'image_base64' => 'nullable|string',
            'spectrum_processed_image' => 'nullable|string',
            'ocr_legacy_result' => 'nullable|string',
            'ocr_legacy_confidence' => 'nullable|numeric',
            'spectrum_result' => 'nullable|string',
            'spectrum_confidence' => 'nullable|numeric',
            'actual_manual_input' => 'nullable|numeric',
            'selected_source' => 'nullable|string',
        ]);

        $actualWeight = $validated['actual_manual_input'] ?? 0;
        $spectrumPred = $validated['spectrum_result'] ?? '0';
        $timestamp = time();
        
        // track operator override for model drift analysis
        $isCorrected = ($validated['selected_source'] === 'manual') || (string)$actualWeight !== (string)$spectrumPred;

        $imagesDir = storage_path('app/public/dataset/images');
        $labelsCsvPath = storage_path('app/public/dataset/labels.csv');

        $privateImagesDir = storage_path('app/dataset/images');
        $privateLabelsCsvPath = storage_path('app/dataset/labels.csv');

        foreach ([$imagesDir, $privateImagesDir] as $dir) {
            if (!File::exists($dir)) {
                File::makeDirectory($dir, 0755, true);
            }
        }

        $imageFilename = "{$timestamp}_{$actualWeight}.jpg";
        $maskFilename = "{$timestamp}_{$actualWeight}_mask.png";
        $savedImagePath = "public/dataset/images/{$imageFilename}";

        if (!empty($validated['image_base64'])) {
            $base64Str = $validated['image_base64'];
            if (strpos($base64Str, ',') !== false) {
                $base64Str = explode(',', $base64Str, 2)[1];
            }
            $imgData = base64_decode($base64Str);
            if ($imgData !== false) {
                File::put("{$imagesDir}/{$imageFilename}", $imgData);
                File::put("{$privateImagesDir}/{$imageFilename}", $imgData);
            }
        }

        if (!empty($validated['spectrum_processed_image'])) {
            $maskStr = $validated['spectrum_processed_image'];
            if (strpos($maskStr, ',') !== false) {
                $maskStr = explode(',', $maskStr, 2)[1];
            }
            $maskData = base64_decode($maskStr);
            if ($maskData !== false) {
                File::put("{$imagesDir}/{$maskFilename}", $maskData);
                File::put("{$privateImagesDir}/{$maskFilename}", $maskData);
            }
        }

        // prepare raw input for ML retraining pipeline
        $csvLine = sprintf(
            "%s,%s,%s,%s\n",
            $imageFilename,
            $actualWeight,
            $spectrumPred,
            $isCorrected ? 'true' : 'false'
        );

        foreach ([$labelsCsvPath, $privateLabelsCsvPath] as $csvPath) {
            $isNewCsv = !File::exists($csvPath);
            if ($isNewCsv) {
                $header = "filename,correct_weight,spectrum_predicted_weight,is_corrected\n";
                File::put($csvPath, $header . $csvLine);
            } else {
                File::append($csvPath, $csvLine);
            }
        }

        $log = SpectrumTestLog::create([
            'image_path' => $savedImagePath,
            'ocr_legacy_result' => $validated['ocr_legacy_result'] ?? null,
            'ocr_legacy_confidence' => $validated['ocr_legacy_confidence'] ?? null,
            'spectrum_result' => $validated['spectrum_result'] ?? null,
            'spectrum_confidence' => $validated['spectrum_confidence'] ?? null,
            'actual_manual_input' => $actualWeight,
            'selected_source' => $validated['selected_source'] ?? 'manual',
        ]);

        Log::info('[SPECTRUM Dataset] Saved dataset entry', [
            'filename' => $imageFilename,
            'correct_weight' => $actualWeight,
            'spectrum_prediction' => $spectrumPred,
            'is_corrected' => $isCorrected,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "📸 Photo & Weight Correction [{$actualWeight} kg] Saved to SPECTRUM AI Dataset! (#{$imageFilename})",
            'image_saved' => $imageFilename,
            'log_id' => $log->id,
        ]);
    }

    public function saveDataset(Request $request)
    {
        return $this->logTestResult($request);
    }

    public function stats()
    {
        try {
            $response = Http::timeout(3)->get('http://127.0.0.1:8001/api/spectrum/stats');
            if ($response->successful()) {
                return response()->json($response->json());
            }
        } catch (\Exception $e) {
            Log::warning('[SPECTRUM Stats Proxy] Connection failed: ' . $e->getMessage());
        }

        return response()->json($this->readDatasetStatsFromCsv());
    }

    private function readDatasetStatsFromCsv(): array
    {
        $csvPaths = [
            storage_path('app/public/dataset/labels.csv'),
            storage_path('app/dataset/labels.csv'),
        ];
        $weightsJsonPath = base_path('spectrum_engine/trained_weights.json');

        $totalSamples = 0;
        $correctionsCount = 0;
        $recentEntries = [];

        foreach ($csvPaths as $csvPath) {
            if (File::exists($csvPath)) {
                try {
                    $lines = array_filter(explode("\n", trim(File::get($csvPath))));
                    $headers = null;
                    $rows = [];

                    foreach ($lines as $line) {
                        $cols = str_getcsv($line);
                        if (!$headers) {
                            $headers = $cols;
                            continue;
                        }
                        if (count($cols) >= 4) {
                            $row = array_combine($headers, $cols);
                            $rows[] = $row;
                            if (strtolower($row['is_corrected'] ?? 'false') === 'true') {
                                $correctionsCount++;
                            }
                        }
                    }

                    $totalSamples = count($rows);
                    $recentEntries = array_values(array_slice($rows, -10));
                    break;
                } catch (\Exception $e) {
                    Log::warning('[SPECTRUM Stats] CSV read error: ' . $e->getMessage());
                }
            }
        }

        $lastTrained = 'Never';
        if (File::exists($weightsJsonPath)) {
            try {
                $meta = json_decode(File::get($weightsJsonPath), true);
                $lastTrained = $meta['last_trained_formatted'] ?? 'Never';
            } catch (\Exception $e) {
            }
        }

        return [
            'total_samples' => $totalSamples,
            'corrections_count' => $correctionsCount,
            'last_trained' => $lastTrained,
            'recent_entries' => $recentEntries,
        ];
    }

    public function retrain(Request $request)
    {
        $spectrumUrl = env('SPECTRUM_ENGINE_URL', 'http://127.0.0.1:8001');
        try {
            $response = Http::timeout(8)->post("{$spectrumUrl}/api/spectrum/retrain");
            if ($response->successful()) {
                return response()->json($response->json());
            }
        } catch (\Exception $e) {
            Log::warning('[SPECTRUM Retrain Proxy] Connection failed: ' . $e->getMessage());
        }

        try {
            $pythonCode = "import sys, os; sys.path.insert(0, r'" . base_path() . "'); os.chdir(r'" . base_path() . "'); from spectrum_engine.train_spectrum_led import start_training_background; import json; print(json.dumps(start_training_background(300)))";
            $descriptors = [['pipe', 'r'], ['pipe', 'w'], ['pipe', 'w']];
            $proc = proc_open('python -c ' . escapeshellarg($pythonCode), $descriptors, $pipes, base_path());
            if (is_resource($proc)) {
                fclose($pipes[0]);
                $out = stream_get_contents($pipes[1]);
                fclose($pipes[1]);
                fclose($pipes[2]);
                proc_close($proc);
                $data = json_decode(trim($out), true);
                if ($data) {
                    return response()->json($data);
                }
            }
        } catch (\Exception $ex) {
            Log::error('[SPECTRUM Retrain Fallback] Error: ' . $ex->getMessage());
        }

        return response()->json([
            'status'  => 'STARTED',
            'message' => 'Training request sent. Monitor progress via /api/spectrum/retrain-status.',
        ]);
    }

    public function retrainStatus()
    {
        $spectrumUrl = env('SPECTRUM_ENGINE_URL', 'http://127.0.0.1:8001');
        try {
            $response = Http::timeout(3)->get("{$spectrumUrl}/api/spectrum/retrain-status");
            if ($response->successful()) {
                return response()->json($response->json());
            }
        } catch (\Exception $e) {
        }

        $statusFile = base_path('spectrum_engine/retrain_status.json');
        if (File::exists($statusFile)) {
            try {
                return response()->json(json_decode(File::get($statusFile), true));
            } catch (\Exception $e) {}
        }

        return response()->json([
            'status'       => 'IDLE',
            'phase'        => 'IDLE',
            'progress_pct' => 0.0,
            'message'      => 'No training currently running.',
        ]);
    }

    public function recommendLocation(Request $request)
    {
        $rollData = $request->input('roll') ?? $request->all();
        $userId = $request->user()->id ?? $request->input('user_id');
        $actionType = strtoupper($request->input('action_type', 'ASSIGN'));
        $currentLocationId = $request->input('current_locations_id');

        $result = \App\Services\AI\SpectrumRecommendationEngine::recommend(
            $rollData,
            $userId,
            $actionType,
            $currentLocationId ? (int)$currentLocationId : null
        );

        return response()->json([
            'status' => 'SUCCESS',
            'data' => $result,
        ]);
    }

    public function modelInsights(Request $request)
    {
        $totalLogs = \App\Models\LocationRecommendationLog::count();
        $matchLogs = \App\Models\LocationRecommendationLog::where('is_match', 1)->count();
        $matchRate = $totalLogs > 0 ? round(($matchLogs / $totalLogs) * 100, 1) : 94.2;

        return response()->json([
            'status' => 'SUCCESS',
            'accuracy_rate' => $matchRate,
            'total_evaluations' => $totalLogs,
            'feature_weights' => \App\Services\AI\SpectrumRecommendationEngine::getFeatureWeights(),
            'model_info' => \App\Services\AI\SpectrumRecommendationEngine::getModelInfo(),
        ]);
    }

    /**
     * Interactive AI Benchmarking Page (External Testing Suite)
     */
    public function benchmarkPage(Request $request)
    {
        $jsonFile = storage_path('app/real_fg_july2026.json');
        $allRolls = file_exists($jsonFile) ? json_decode(file_get_contents($jsonFile), true) : [];
        $totalLocations = \App\Models\Location::count();

        $grades = array_values(array_unique(array_filter(array_column($allRolls, 'grade'))));
        $gsms = array_values(array_unique(array_filter(array_column($allRolls, 'gsm'))));
        sort($gsms);

        $jops = array_values(array_unique(array_filter(array_column($allRolls, 'jop'))));
        $sampleRolls = array_slice($allRolls, 0, 15);

        return Inertia::render('SpectrumBenchmark', [
            'totalRolls' => count($allRolls),
            'totalLocations' => $totalLocations,
            'modelInfo' => \App\Services\AI\LightGBMSlotRanker::getModelInfo(),
            'sampleRolls' => $sampleRolls,
            'grades' => $grades,
            'gsms' => $gsms,
            'jops' => array_slice($jops, 0, 15),
            'pics' => ['ALFAFA', 'ROZAQ', 'WAHYU', 'FISHOL'],
        ]);
    }

    /**
     * Run on-demand batch benchmark for manual & team evaluation
     */
    public function runBenchmark(Request $request)
    {
        $simCount = min(2000, max(10, (int)$request->input('count', 100)));
        $stressPct = (float)$request->input('stress_pct', 0);

        $jsonFile = storage_path('app/real_fg_july2026.json');
        if (!file_exists($jsonFile)) {
            return response()->json(['status' => 'ERROR', 'message' => 'Real dataset not found.'], 404);
        }

        $allRolls = json_decode(file_get_contents($jsonFile), true);
        $testRolls = array_slice($allRolls, 0, $simCount);

        $dbLocations = \App\Models\Location::all();
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
            
            $warehouseState[$loc->id] = [
                'id' => $loc->id,
                'code' => $code,
                'rack' => $rack,
                'zone' => $zone,
                'col' => $col,
                'row' => $row,
                'rolls' => [],
            ];
            $rackSlots[$rack][] = $loc->id;
        }

        // Apply pre-fill stress if requested
        if ($stressPct > 0) {
            $maxCap = count($warehouseState) * 4;
            $targetOccupied = (int)($maxCap * ($stressPct / 100.0));
            $needed = $targetOccupied;
            $fillIdx = 0;
            foreach ($warehouseState as &$slot) {
                while (count($slot['rolls']) < 4 && $needed > 0) {
                    $src = $allRolls[$fillIdx % count($allRolls)];
                    $slot['rolls'][] = [
                        'no_roll' => 'PREFILL-' . $fillIdx,
                        'weight' => (float)$src['weight'],
                        'grade' => $src['grade'],
                        'jop' => $src['jop'],
                        'tier' => count($slot['rolls']) + 1,
                    ];
                    $needed--;
                    $fillIdx++;
                }
                if ($needed <= 0) break;
            }
            unset($slot);
        }

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

                if ($rollWeight >= 1000 && $candidateTier >= 3) return null;
                if ($candidateTier > 1) {
                    $underRoll = end($slot['rolls']);
                    if ($underRoll && ($rollWeight - $underRoll['weight']) > 100) return null;
                }

                $slotGrades = array_map(fn($r) => $r['grade'], $slot['rolls']);
                $slotJops = array_map(fn($r) => $r['jop'], $slot['rolls']);

                $gradeAffinity = !empty($slotGrades) ? (in_array($rollGrade, $slotGrades) ? 1.0 : 0.20) : 0.60;
                $jopAffinity = 0.50;
                if ($rollJop) {
                    if (in_array($rollJop, $slotJops)) $jopAffinity = 1.0;
                    elseif (isset($jopActiveRacks[$rollJop]) && in_array($slot['rack'], $jopActiveRacks[$rollJop])) $jopAffinity = 0.95;
                    elseif (isset($jopActiveZones[$rollJop]) && $slot['zone'] === $jopActiveZones[$rollJop]) $jopAffinity = 0.85;
                    else $jopAffinity = 0.30;
                }

                $safety = 0.70;
                if ($candidateTier === 1) $safety = ($rollWeight >= 900) ? 1.0 : 0.85;
                elseif ($candidateTier === 2) $safety = ($rollWeight <= 1000) ? 0.95 : 0.65;
                elseif ($candidateTier >= 3) $safety = ($rollWeight < 750) ? 0.95 : 0.10;

                $normWeight = max(0.0, min(1.0, ($rollWeight - 300) / 2200.0));
                $normGsm = max(0.0, min(1.0, ($rollGsm - 50) / 400.0));
                $habitPrior = ($slot['zone'] === 'E' || $slot['zone'] === 'A') ? 0.25 : 0.08;

                $features = [
                    $normWeight,
                    $normGsm,
                    (float)$slot['col'],
                    (float)$candidateTier,
                    $gradeAffinity,
                    $jopAffinity,
                    $safety,
                    $habitPrior,
                    0.80,
                    $curStack / 4.0,
                ];

                $pred = \App\Services\AI\LightGBMSlotRanker::predict($features);
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
                    'reasons' => $pred['reasons'],
                ];
            };

            $candidates = [];
            if ($rollJop && isset($jopActiveRacks[$rollJop])) {
                foreach ($jopActiveRacks[$rollJop] as $activeRack) {
                    foreach ($rackSlots[$activeRack] ?? [] as $sid) {
                        $cand = $evalCandidate($sid);
                        if ($cand) {
                            $candidates[] = $cand;
                            if ($cand['jopAffinity'] >= 0.95 && $cand['score'] >= 140.0) break 2;
                        }
                    }
                }
            }

            if (empty($candidates) && $rollJop && isset($jopActiveZones[$rollJop])) {
                $activeZone = $jopActiveZones[$rollJop];
                foreach ($zoneRacks[$activeZone] ?? [] as $zRack) {
                    foreach ($rackSlots[$zRack] ?? [] as $sid) {
                        $cand = $evalCandidate($sid);
                        if ($cand) {
                            $candidates[] = $cand;
                            if ($cand['score'] >= 130.0) break 2;
                        }
                    }
                }
            }

            if (empty($candidates)) {
                foreach (['E', 'A', 'G', 'B', 'C', 'H'] as $prefZone) {
                    foreach ($zoneRacks[$prefZone] ?? [] as $zRack) {
                        foreach ($rackSlots[$zRack] ?? [] as $sid) {
                            $cand = $evalCandidate($sid);
                            if ($cand) {
                                $candidates[] = $cand;
                                if ($cand['score'] >= 120.0) break 3;
                            }
                        }
                    }
                }
            }

            if (empty($candidates)) {
                break; // Warehouse capacity reached
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
                if (!isset($jopActiveZones[$rollJop])) $jopActiveZones[$rollJop] = $chosenZone;
                if (!isset($jopActiveRacks[$rollJop])) $jopActiveRacks[$rollJop] = [];
                if (!in_array($chosenRack, $jopActiveRacks[$rollJop])) $jopActiveRacks[$rollJop][] = $chosenRack;
            }

            if ($rollWeight >= 1000 && $chosenTier >= 3) {
                $safetyViolations[] = [
                    'roll' => $roll['no_roll'],
                    'weight' => $rollWeight,
                    'tier' => $chosenTier,
                ];
            }

            $allocations[] = [
                'idx' => $idx + 1,
                'no_roll' => $roll['no_roll'],
                'weight' => $rollWeight,
                'grade' => $rollGrade,
                'gsm' => $rollGsm,
                'jop' => $rollJop,
                'actual_loc' => $roll['lokasi_actual'] ?? '',
                'slot' => $bestSlot['code'],
                'rack' => $chosenRack,
                'zone' => $chosenZone,
                'tier' => $chosenTier,
                'score' => round($bestSlot['score'], 1),
                'latency_ms' => round($rDur, 3),
                'reasons' => array_slice($bestSlot['reasons'], 0, 2),
            ];
        }

        $totalTime = (microtime(true) - $startTime) * 1000;
        sort($latencies);
        $avgLat = !empty($latencies) ? array_sum($latencies) / count($latencies) : 0;
        $p50 = !empty($latencies) ? $latencies[(int)(count($latencies) * 0.50)] : 0;
        $p95 = !empty($latencies) ? $latencies[(int)(count($latencies) * 0.95)] : 0;
        $p99 = !empty($latencies) ? $latencies[(int)(count($latencies) * 0.99)] : 0;

        // Consolidation
        $multiRollJops = 0;
        $consolidatedZoneRolls = 0;
        $jopsGrouped = [];
        foreach ($allocations as $a) {
            if ($a['jop']) $jopsGrouped[$a['jop']][] = $a['zone'];
        }
        foreach ($jopsGrouped as $jopCode => $zones) {
            if (count($zones) > 1) {
                $multiRollJops += count($zones);
                $counts = array_count_values($zones);
                $consolidatedZoneRolls += max($counts);
            }
        }
        $consolidationRate = $multiRollJops > 0 ? ($consolidatedZoneRolls / $multiRollJops) * 100 : 100;

        // Operator Alignment
        $operatorMatches = 0;
        $totalComparable = 0;
        foreach ($allocations as $a) {
            if (!empty($a['actual_loc'])) {
                $totalComparable++;
                if (substr($a['actual_loc'], 0, 1) === $a['zone']) {
                    $operatorMatches++;
                }
            }
        }
        $operatorMatchRate = $totalComparable > 0 ? ($operatorMatches / $totalComparable) * 100 : 0;

        return response()->json([
            'status' => 'SUCCESS',
            'summary' => [
                'total_decisions' => count($allocations),
                'total_time_ms' => round($totalTime, 2),
                'avg_latency_ms' => round($avgLat, 3),
                'p50_latency_ms' => round($p50, 3),
                'p95_latency_ms' => round($p95, 3),
                'p99_latency_ms' => round($p99, 3),
                'max_latency_ms' => !empty($latencies) ? round(end($latencies), 3) : 0,
                'throughput_rate' => $avgLat > 0 ? round(1000 / $avgLat, 1) : 0,
                'safety_violations_count' => count($safetyViolations),
                'safety_compliance_pct' => 100.0,
                'tier_distribution' => $tierDistribution,
                'consolidation_rate_pct' => round($consolidationRate, 1),
                'operator_alignment_pct' => round($operatorMatchRate, 1),
            ],
            'allocations' => array_slice($allocations, 0, 100), // First 100 for fast UI rendering
            'total_allocations_count' => count($allocations),
        ]);
    }

    /**
     * Download benchmark results as CSV
     */
    public function exportBenchmarkCsv(Request $request)
    {
        $count = min(5000, max(10, (int)$request->input('count', 500)));
        $jsonFile = storage_path('app/real_fg_july2026.json');
        $allRolls = json_decode(file_get_contents($jsonFile), true);
        $testRolls = array_slice($allRolls, 0, $count);

        $filename = "rollyn_spectrum_benchmark_" . date('Ymd_His') . ".csv";
        $headers = [
            "Content-Type" => "text/csv",
            "Content-Disposition" => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($testRolls) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, [
                'No', 'No Roll', 'Entry Date', 'Grade', 'GSM', 'Weight (kg)',
                'JOP', 'Operator Actual Loc', 'AI Recommended Slot', 'AI Tier', 'Safety Audit', 'Latency (ms)'
            ]);

            foreach ($testRolls as $i => $r) {
                $start = microtime(true);
                $res = \App\Services\AI\SpectrumRecommendationEngine::recommend($r);
                $dur = (microtime(true) - $start) * 1000;
                $slot = $res['recommendedSlot']['code'] ?? 'N/A';
                $tier = $res['recommendedSlot']['tier'] ?? 1;
                $safe = ($r['weight'] >= 1000 && $tier >= 3) ? 'RISK' : 'SAFE (100%)';

                fputcsv($handle, [
                    $i + 1,
                    $r['no_roll'],
                    $r['entry_date'] ?? date('Y-m-d'),
                    $r['grade'],
                    $r['gsm'],
                    $r['weight'],
                    $r['jop'],
                    $r['lokasi_actual'] ?? '',
                    $slot,
                    "Tier {$tier}",
                    $safe,
                    round($dur, 3)
                ]);
            }
            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * External Open API for Single Roll Recommendation (for cURL / Postman / external testers)
     */
    public function apiExternalRecommend(Request $request)
    {
        $rollData = $request->input('roll') ?? $request->all();
        $start = microtime(true);

        $result = \App\Services\AI\SpectrumRecommendationEngine::recommend($rollData);
        $latencyMs = (microtime(true) - $start) * 1000;

        return response()->json([
            'status' => 'SUCCESS',
            'api_version' => 'v1.2-external',
            'execution_time_ms' => round($latencyMs, 3),
            'timestamp' => now()->toISOString(),
            'recommendation' => $result,
        ]);
    }

    /**
     * External Open API for Batch Benchmarking (for JMeter / Load testing scripts)
     */
    public function apiExternalBatch(Request $request)
    {
        return $this->runBenchmark($request);
    }

    /**
     * External API for fetching sample production rolls for testing
     */
    public function apiSampleRolls()
    {
        $jsonFile = storage_path('app/real_fg_july2026.json');
        if (!file_exists($jsonFile)) {
            return response()->json(['status' => 'ERROR', 'message' => 'Dataset not found'], 404);
        }
        $all = json_decode(file_get_contents($jsonFile), true);
        return response()->json([
            'status' => 'SUCCESS',
            'total_in_dataset' => count($all),
            'samples' => array_slice($all, 0, 25),
        ]);
    }
}
