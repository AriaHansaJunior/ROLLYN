<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call([
            RollDatabaseSeeder::class,
            LocationSeeder::class,
            KolomESeeder::class,
            GudangBKiriSeeder::class,
            GudangBKananSeeder::class,
            GudangCKiriSeeder::class,
            GudangCKananSeeder::class,
            KolomGSeeder::class,
            GudangHSeeder::class,
            RealDataSeeder::class,
            TargetOrderSeeder::class,
        ]);
    }
}
