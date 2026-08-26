<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class KolomESeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $records = [];
        $slotsE = [];

        // All racks E17 to E2: 4 cols, 12 rows
        $allRacks = [17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
        foreach ($allRacks as $rackNum) {
            for ($col = 4; $col >= 1; $col--) {
                for ($row = 1; $row <= 12; $row++) {
                    $slotsE[] = "E{$rackNum}-{$col}-{$row}";
                }
            }
        }

        foreach ($slotsE as $loc) {
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
            $this->command->info("Inserted " . count($records) . " locations for Kolom E.");
        } else {
            $this->command->info("No new locations to insert for Kolom E.");
        }
    }
}
