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

        $existing = DB::table('locations')->where('location', 'like', 'C%')->where('location', 'not like', 'C%L%')->pluck('location')->flip();

        // Racks C33 to C22 (C35, C34, C21 are not usable in the database)
        for ($rack = 33; $rack >= 22; $rack--) {
            $rackPrefix = 'C' . $rack;

            // 4 columns
            for ($col = 1; $col <= 4; $col++) {
                // 6 rows
                for ($row = 1; $row <= 6; $row++) {
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

        // Insert in chunks
        if (!empty($locations)) {
            $chunks = array_chunk($locations, 100);
            foreach ($chunks as $chunk) {
                DB::table('locations')->insert($chunk);
            }
        }
    }
}
