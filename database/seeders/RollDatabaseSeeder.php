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

        DB::table('customers')->insertOrIgnore([
            ['id' => 1, 'customer' => 'Indonesia', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 2, 'customer' => 'China', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 3, 'customer' => 'Asia carton', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 4, 'customer' => 'King Paper', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 5, 'customer' => 'Alkindo', 'created_at' => now(), 'updated_at' => now()],
        ]);

        DB::table('users')->insertOrIgnore([
            ['id' => 1, 'username' => 'ADMIN', 'email' => 'admin@spectacore.id', 'password' => Hash::make('password'), 'role' => 'admin', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 2, 'username' => 'WAHYU', 'email' => 'wahyu@spectacore.id', 'password' => Hash::make('password'), 'role' => 'operator', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 3, 'username' => 'FISHOL', 'email' => 'fishol@spectacore.id', 'password' => Hash::make('password'), 'role' => 'operator', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}