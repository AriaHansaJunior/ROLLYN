<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$t0 = microtime(true);
echo "Testing IncomingRollController::index()...\n";
try {
    $res = (new App\Http\Controllers\IncomingRollController)->index();
    echo "Done in " . round(microtime(true) - $t0, 3) . "s\n";
} catch (\Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

$t1 = microtime(true);
echo "Testing JumboRollController::index()...\n";
try {
    $req = new Illuminate\Http\Request();
    $res = (new App\Http\Controllers\JumboRollController)->index($req);
    echo "Done in " . round(microtime(true) - $t1, 3) . "s\n";
} catch (\Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
