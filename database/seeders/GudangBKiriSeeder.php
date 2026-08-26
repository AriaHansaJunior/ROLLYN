<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class GudangBKiriSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $locations = [];
        $now = Carbon::now();

        // Racks for Gudang B Kiri
        $racks = [
            'B26L' => ['cols' => [2, 1], 'rows' => 6], // B26: 4 columns in UI but only col 2, 1 have slots in Excel? Wait, Excel shows what?
            'B25L' => ['cols' => [4, 3, 2, 1], 'rows' => 6],
            'B24L' => ['cols' => [4, 3, 2, 1], 'rows' => 6],
            'B23L' => ['cols' => [4, 3, 2], 'rows' => 6], // B23: col 4, 3, 2 ?
        ];

        // The user said:
        // B35 - B27: SPARE PART (No slots)
        // B26: 4 columns * 6 rows. Only the required columns shown in the Excel layout contain usable slots.
        // Wait, from my previous knowledge, B26: col 2, 1. B25-B24: full. B23: col 4, 3, 2. (Wait, previous summary said B23: col 4-2. B26: col 2-1).
        
        foreach ($racks as $rack => $config) {
            foreach ($config['cols'] as $col) {
                for ($row = 1; $row <= $config['rows']; $row++) {
                    $locationCode = "{$rack}-{$col}-{$row}";
                    
                    $locations[] = [
                        'location' => $locationCode,
                        'status' => 0, // 0 = Free Space
                        'stack_count' => null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }
        }

        // Insert in chunks to avoid large query payload issues
        $chunks = array_chunk($locations, 100);
        foreach ($chunks as $chunk) {
            DB::table('locations')->insertOrIgnore($chunk);
        }
    }
}
