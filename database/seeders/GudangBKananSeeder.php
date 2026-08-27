<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class GudangBKananSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $records = [];
        $slotsB = [];

        // Racks B35 to B21: 4 cols, 6 rows
        $racks = [35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21];
        foreach ($racks as $rackNum) {
            for ($col = 4; $col >= 1; $col--) {
                for ($row = 1; $row <= 6; $row++) {
                    $slotsB[] = "B{$rackNum}-{$col}-{$row}";
                }
            }
        }

        $existing = DB::table('locations')->where('location', 'like', 'B%')->pluck('location')->flip();

        foreach ($slotsB as $loc) {
            if (!isset($existing[$loc])) {
                $records[] = [
                    'location' => $loc,
                    'status' => 0, // Free Space
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        if (!empty($records)) {
            $chunks = array_chunk($records, 100);
            foreach ($chunks as $chunk) {
                DB::table('locations')->insert($chunk);
            }
            $this->command->info("Inserted " . count($records) . " locations for Gudang B (Kanan).");
        } else {
            $this->command->info("No new locations to insert for Gudang B (Kanan).");
        }
    }
}
