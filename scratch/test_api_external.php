<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$req = Illuminate\Http\Request::create('/api/v1/spectrum/recommend', 'POST', [
    'weight' => 1050,
    'grade' => 'SPECTA - LY3',
    'gsm' => 500,
    'jop' => 'JOP-0726-00001'
]);
$res = $kernel->handle($req);

echo "HTTP Status: " . $res->getStatusCode() . PHP_EOL;
echo "JSON Response:\n" . json_encode(json_decode($res->getContent()), JSON_PRETTY_PRINT) . PHP_EOL;

