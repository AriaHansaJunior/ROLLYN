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

        $records = [];
        $now = now();

        // Generate Kolom A slots (420 Physical Database Slots)
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
