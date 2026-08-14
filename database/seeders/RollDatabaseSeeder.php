<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class RollDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed Master Data Simple
        DB::table('shifts')->insertOrIgnore([
            ['id' => 1, 'shift' => '1', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 2, 'shift' => '2', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 3, 'shift' => '3', 'created_at' => now(), 'updated_at' => now()],
        ]);

        DB::table('grades')->insertOrIgnore([
            ['id' => 1, 'grade' => 'SPECTA - LY3', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 2, 'grade' => 'SPECTA - TK4', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 3, 'grade' => 'SPECTA - LY4', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 4, 'grade' => 'GRADE - XX', 'created_at' => now(), 'updated_at' => now()],
        ]);

        DB::table('gsms')->insertOrIgnore([
            ['id' => 1, 'gsm' => 500, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 2, 'gsm' => 420, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 3, 'gsm' => 360, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 4, 'gsm' => 395, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 5, 'gsm' => 450, 'created_at' => now(), 'updated_at' => now()],
        ]);

        DB::table('plybonds')->insertOrIgnore([
            ['id' => 1, 'plybonds' => 300, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 2, 'plybonds' => 400, 'created_at' => now(), 'updated_at' => now()],
        ]);

        DB::table('thicknesses')->insertOrIgnore([
            ['id' => 1, 'thickness' => 700, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 2, 'thickness' => 600, 'created_at' => now(), 'updated_at' => now()],
        ]);

        DB::table('rolls_widths')->insertOrIgnore([
            ['id' => 1, 'width' => 1120, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 2, 'width' => 1133, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 3, 'width' => 1110, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 4, 'width' => 1220, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 5, 'width' => 1200, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 6, 'width' => 1224, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 7, 'width' => 828, 'created_at' => now(), 'updated_at' => now()],
        ]);

        DB::table('rolls_diameters')->insertOrIgnore([
            ['id' => 1, 'diameter' => 1230, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 2, 'diameter' => 1240, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 3, 'diameter' => 1220, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 4, 'diameter' => 1225, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 5, 'diameter' => 1215, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 6, 'diameter' => 1260, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 7, 'diameter' => 1250, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 8, 'diameter' => 1255, 'created_at' => now(), 'updated_at' => now()],
        ]);

        DB::table('cores')->insertOrIgnore([
            ['id' => 1, 'core' => '3', 'created_at' => now(), 'updated_at' => now()],
        ]);

        DB::table('cobbs')->insertOrIgnore([
            ['id' => 1, 'cobb' => '150-250', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 2, 'cobb' => '< 150', 'created_at' => now(), 'updated_at' => now()],
        ]);
        $locations = [];
        $locationId = 1;
        for ($area = 2; $area <= 17; $area++) {
            $areaCode = 'E' . str_pad($area, 2, '0', STR_PAD_LEFT); // E02, E03, ..., E17

            // Loop untuk Kolom 1 sampai 4
            for ($column = 1; $column <= 4; $column++) {
                $columnCode = str_pad($column, 2, '0', STR_PAD_LEFT); // 01, 02, 03, 04

                // Loop untuk Tingkat 1 sampai 4 (1 = paling bawah)
                for ($tier = 1; $tier <= 4; $tier++) {
                    $locationId++;
                    $tierCode = str_pad($tier, 2, '0', STR_PAD_LEFT); // 01, 02, 03, 04

                    // Gabungkan kode lokasi: EXX-YY-ZZ
                    $locationLoc = "{$areaCode}-{$columnCode}-{$tierCode}";

                    $locations[] = [
                        'id'       => $locationId,
                        'location' => $locationLoc,
                        'status'     => 0,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            }
        }
        DB::table('locations')->insert(['id' => 0, 'location' => 'C', 'status' => 0, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('locations')->insert($locations);
        DB::table('customers')->insertOrIgnore([
            ['id' => 1, 'customer' => 'Indonesia', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 2, 'customer' => 'China', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 3, 'customer' => 'Asia carton', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 4, 'customer' => 'King Paper', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 5, 'customer' => 'Alkindo', 'created_at' => now(), 'updated_at' => now()],
        ]);

        DB::table('users')->insertOrIgnore([
            ['id' => 1, 'username' => 'WAHYU', 'password' => Hash::make('password'), 'role' => 'operator', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 2, 'username' => 'FISHOL', 'password' => Hash::make('password'), 'role' => 'operator', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 3, 'username' => 'ALFAFA', 'password' => Hash::make('password'), 'role' => 'operator', 'created_at' => now(), 'updated_at' => now()],
        ]);

        // 2. Seed JOPs Data (Berdasarkan image_3255be.jpg)
        DB::table('jops')->insertOrIgnore([
            [
                'id' => 1,
                'spk' => '0726-00001-1',
                'jop' => 'JOP-0726-00001',
                'po' => 'FCL-Jul-1',
                'customers_id' => 1, // Indonesia
                'grades_id' => 1,    // SPECTA - LY3
                'gsms_id' => 1,      // 500
                'rolls_widths_id' => 1, // 1120
                'quantity' => 160,
                'weight' => 168000,
                'container' => 8,
                'noted_order' => 'RD 1200-1240mm',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'id' => 2,
                'spk' => '0726-00002-1',
                'jop' => 'JOP-0726-00002',
                'po' => 'LY202606001-2',
                'customers_id' => 2, // China
                'grades_id' => 2,    // SPECTA - TK4
                'gsms_id' => 2,      // 420
                'rolls_widths_id' => 2, // 1133
                'quantity' => 2544,
                'weight' => 2766600,
                'container' => 106,
                'noted_order' => 'Cobb <150, RD 1240-1260mm',
                'created_at' => now(),
                'updated_at' => now()
            ],
        ]);

        // 3. Seed Sample Rolls Data (Berdasarkan image_32ab3c.png, image_32597e.png, image_325920.png)
        DB::table('rolls')->insertOrIgnore([
            [
                'no' => 2,
                'no_roll' => '260701-01.01.01',
                'form' => 1,
                'shifts_id' => 1,
                'entry_date' => '2026-07-01',
                'grades_id' => 1, // SPECTA - LY3
                'plybonds_id' => 1, // 300
                'thicknesses_id' => 1, // 700
                'bulk' => 1.4,
                'rolls_diameters_id' => 1, // 1230
                'weight' => 1007,
                'cores_id' => 1, // 3
                'cobbs_id' => 1, // 150-250
                'exmaterial' => 'IMPORT',
                'visual' => '0',
                'users_id' => 1, // WAHYU
                'jops_id' => 1, // JOP-0726-00001
                'created_at' => now(), 'updated_at' => now()
            ],
            [
                'no' => 84,
                'no_roll' => '260701-06.01.03',
                'form' => 6,
                'shifts_id' => 1,
                'entry_date' => '2026-07-01',
                'grades_id' => 4, // GRADE - XX
                'plybonds_id' => 1, // 300
                'thicknesses_id' => 1, // 700
                'bulk' => 1.4,
                'rolls_diameters_id' => 2, // 1240
                'weight' => 1043,
                'cores_id' => 1, // 3
                'cobbs_id' => 1, // 150-250
                'exmaterial' => 'IMPORT',
                'visual' => 'KOTORAN DALAM ROLL',
                'users_id' => 1, // WAHYU
                'jops_id' => 1, // JOP-0726-00001
                'created_at' => now(), 'updated_at' => now()
            ],
            [
                'no' => 480,
                'no_roll' => '260702-06.01.03',
                'form' => 7,
                'shifts_id' => 1,
                'entry_date' => '2026-07-02',
                'grades_id' => 4, // GRADE - XX
                'plybonds_id' => 2, // 400
                'thicknesses_id' => 2, // 600
                'bulk' => 1.4,
                'rolls_diameters_id' => 6, // 1260
                'weight' => 1115,
                'cores_id' => 1, // 3
                'cobbs_id' => 2, // < 150
                'exmaterial' => 'IMPORT',
                'visual' => 'KOTORAN DALAM ROLL',
                'users_id' => 2, // FISHOL
                'jops_id' => 2, // JOP-0726-00002
                'created_at' => now(), 'updated_at' => now()
            ],
            [
                'no' => 1574,
                'no_roll' => '260704-23.02.01',
                'form' => 28,
                'shifts_id' => 3,
                'entry_date' => '2026-07-04',
                'grades_id' => 4, // GRADE - XX
                'plybonds_id' => 2, // 400
                'thicknesses_id' => 2, // 600
                'bulk' => 1.4,
                'rolls_diameters_id' => 6, // 1260
                'weight' => 1109,
                'cores_id' => 1, // 3
                'cobbs_id' => 2, // < 150
                'exmaterial' => 'IMPORT', // E13-04
                'visual' => 'GSM RENDAH',
                'users_id' => 1, // WAHYU
                'jops_id' => 2, // JOP-0726-00002
                'created_at' => now(), 'updated_at' => now()
            ],
        ]);
    }
}