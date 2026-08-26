<?php
require __DIR__.'/bootstrap/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$now = now();
$records = [];
$slotsE = [];

// E17 and E16: 4 cols, 6 rows
foreach ([17, 16] as $rackNum) {
    for ($col = 4; $col >= 1; $col--) {
        for ($row = 1; $row <= 6; $row++) {
            $slotsE[] = "E{$rackNum}-{$col}-{$row}";
        }
    }
}

// E15 to E2: 4 cols, 12 rows
$normalRacks12 = [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
foreach ($normalRacks12 as $rackNum) {
    for ($col = 4; $col >= 1; $col--) {
        for ($row = 1; $row <= 12; $row++) {
            $slotsE[] = "E{$rackNum}-{$col}-{$row}";
        }
    }
}

foreach ($slotsE as $loc) {
    // Only insert if it doesn't exist to be safe
    $exists = DB::table('locations')->where('location', $loc)->exists();
    if (!$exists) {
        $records[] = [
            'location' => $loc,
            'status' => 0,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }
}

if (!empty($records)) {
    DB::table('locations')->insert($records);
    echo "Inserted " . count($records) . " locations for Kolom E.\n";
} else {
    echo "No new locations to insert for Kolom E.\n";
}
