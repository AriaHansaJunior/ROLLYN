<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Location;
use Carbon\Carbon;

class GudangHSeeder extends Seeder
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

        // Racks H3 to H1
        for ($rack = 3; $rack >= 1; $rack--) {
            $rackPrefix = 'H' . $rack;

            // 4 columns
            for ($col = 1; $col <= 4; $col++) {
                // 15 rows
                for ($row = 1; $row <= 15; $row++) {
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
