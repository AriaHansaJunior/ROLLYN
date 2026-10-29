<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\AI\SpectrumRecommendationEngine;

$rolls = json_decode(file_get_contents(__DIR__ . '/../storage/app/real_fg_july2026.json'), true);

echo "Loaded " . count($rolls) . " real rolls.\n";

$sampleRoll = $rolls[0];
echo "Testing roll 0: " . json_encode($sampleRoll, JSON_PRETTY_PRINT) . "\n";

$start = microtime(true);
$rec = SpectrumRecommendationEngine::recommend($sampleRoll);
$dur = (microtime(true) - $start) * 1000;

echo "Recommendation result in {$dur} ms:\n";
echo json_encode($rec, JSON_PRETTY_PRINT) . "\n";

