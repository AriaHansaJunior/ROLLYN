<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Location;
use Carbon\Carbon;

class GudangCKananSeeder extends Seeder
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

        // Racks C33 to C22 (C35, C34, C21 are not usable in the database)
        for ($rack = 33; $rack >= 22; $rack--) {
            $rackPrefix = 'C' . $rack;

            // 4 columns
            for ($col = 1; $col <= 4; $col++) {
                // 6 rows
                for ($row = 1; $row <= 6; $row++) {
                    $locationCode = $rackPrefix . '-' . $col . '-' . $row;
                    
                    // Check if exists
                    if (!Location::where('location', $locationCode)->exists()) {
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

        // Insert directly
        if (!empty($locations)) {
            DB::table('locations')->insert($locations);
        }
    }
}
