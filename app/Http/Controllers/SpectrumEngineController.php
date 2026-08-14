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

    public function detect(Request $request)
    {
        $base64Image = $request->input('image') ?? $request->input('image_base64');
        $images = $request->input('images');

        if (empty($base64Image) && empty($images)) {
            return response()->json([
                'status' => 'ERROR',
                'weight_detected' => 0,
                'confidence' => 0.0,
                'message' => 'Param image, image_base64, or images is required.',
            ], 422);
        }

        $payload = !empty($images) ? ['images' => $images] : ['image' => $base64Image];

        try {
            $response = Http::timeout(5)->post('http://127.0.0.1:8001/api/spectrum/detect', $payload);

            if ($response->successful()) {
                return response()->json($response->json());
            }
        } catch (\Exception $e) {
            Log::warning('[SPECTRUM Proxy] Microservice connection failed: ' . $e->getMessage());
        }

        try {
            $tempImg = sys_get_temp_dir() . '/spectrum_in_' . uniqid() . '.txt';
            file_put_contents($tempImg, $base64Image);

            $pythonCode = "
import sys, json
from spectrum_engine.app import decode_base64_image, process_spectrum_detection

with open(r'{$tempImg}', 'r') as f:
    b64 = f.read()

img = decode_base64_image(b64)
res = process_spectrum_detection(img)
print(json.dumps(res))
";
            $cmd = 'python -c ' . escapeshellarg($pythonCode);
            $output = shell_exec($cmd);
            @unlink($tempImg);

            if ($output) {
                $data = json_decode(trim($output), true);
                if ($data) {
                    return response()->json($data);
                }
            }
        } catch (\Exception $ex) {
            Log::error('[SPECTRUM Fallback] Local execution error: ' . $ex->getMessage());
        }

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
            'message' => "📸 Foto & Koreksi Berat [{$actualWeight} kg] Tersimpan ke Dataset SPECTRUM AI! (#{$imageFilename})",
            'image_saved' => $imageFilename,
            'log_id' => $log->id,
        ]);
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
                    break; // Found a valid CSV, stop searching
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
        try {
            $response = Http::timeout(8)->post('http://127.0.0.1:8001/api/spectrum/retrain');
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
            'message' => 'Training request dikirim. Pantau progress via /api/spectrum/retrain-status.',
        ]);
    }

    public function retrainStatus()
    {
        try {
            $response = Http::timeout(3)->get('http://127.0.0.1:8001/api/spectrum/retrain-status');
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
            'message'      => 'Belum ada training berjalan.',
        ]);
    }
}
