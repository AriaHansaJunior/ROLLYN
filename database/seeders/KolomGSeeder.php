<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Location;
use Carbon\Carbon;

class KolomGSeeder extends Seeder
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

        $existing = DB::table('locations')->where('location', 'like', 'G%')->pluck('location')->flip();

        // Racks G12 to G1
        for ($rack = 12; $rack >= 1; $rack--) {
            $rackPrefix = 'G' . $rack;

            // 4 columns
            for ($col = 1; $col <= 4; $col++) {
                // Special condition for G1: only cols 3 and 4 are usable
                if ($rack === 1 && ($col === 1 || $col === 2)) {
                    continue; // Skip these columns for G1
                }

                // 12 rows
                for ($row = 1; $row <= 12; $row++) {
                    $locationCode = $rackPrefix . '-' . $col . '-' . $row;
                    
                    // Check if exists
                    if (!isset($existing[$locationCode])) {
                        $locations[] = [
                            'location' => $locationCode,
                            'status' => 0, // Free space
                            'created_at' => $now,
                            'updated_at' => $now,
                        ];
                    }
                }
            }
        }

        // Insert in chunks to be safe
        $chunks = array_chunk($locations, 100);
        foreach ($chunks as $chunk) {
            DB::table('locations')->insert($chunk);
        }
    }
}
