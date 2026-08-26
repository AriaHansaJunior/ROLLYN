<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LocationSeeder extends Seeder
{

    public function run(): void
    {

        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('locations')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $locationNames = [
            "E17-01-1", "E17-01-2", "E17-01-3", "E17-01-4", "E17-02-1", "E17-02-2", "E17-02-3", "E17-02-4",
            "E17-03-1", "E17-03-2", "E17-03-3", "E17-03-4", "E17-04-1", "E17-04-2", "E17-04-3", "E17-04-4",
            "E17-05-1", "E17-05-2", "E17-05-3", "E17-05-4", "E17-06-1", "E17-06-2", "E17-06-3", "E17-06-4",
            "E17-07-1", "E17-07-2", "E17-07-3", "E17-07-4", "E17-08-1", "E17-08-2", "E17-08-3", "E17-08-4",
            "E17-09-1", "E17-09-2", "E17-09-3", "E17-09-4", "E17-10-1", "E17-10-2", "E17-10-3", "E17-10-4",
            "E17-11-1", "E17-11-2", "E17-11-3", "E17-11-4", "E17-12-1", "E17-12-2", "E17-12-3", "E17-12-4"
        ];

        $records = [];
        $now = now();
        foreach ($locationNames as $loc) {
            $records[] = [
                'location' => $loc,
                'status' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        // Generate Kolom A slots
        $slotsA = [];

        // A17 to A5: 4 cols × 6 rows each (skip A16 and A14 which are Loading Docks)
        $normalRacks6 = [17, 15, 13, 12, 11, 10, 9, 8, 7, 6, 5];
        foreach ($normalRacks6 as $rackNum) {
            for ($col = 4; $col >= 1; $col--) {
                for ($row = 1; $row <= 6; $row++) {
                    $slotsA[] = "A{$rackNum}-{$col}-{$row}";
                }
            }
        }

        // A4: only col 1, rows 1-12
        for ($row = 1; $row <= 12; $row++) {
            $slotsA[] = "A4-1-{$row}";
        }

        // A3, A2, A1: 4 cols × 12 rows each
        foreach ([3, 2, 1] as $rackNum) {
            for ($col = 4; $col >= 1; $col--) {
                for ($row = 1; $row <= 12; $row++) {
                    $slotsA[] = "A{$rackNum}-{$col}-{$row}";
                }
            }
        }

        foreach ($slotsA as $loc) {
            $records[] = [
                'location' => $loc,
                'status' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::table('locations')->insert($records);
    }
}
