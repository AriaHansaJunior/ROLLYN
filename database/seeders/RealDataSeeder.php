<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class RealDataSeeder extends Seeder
{

    public function run(): void
    {
        $user = \App\Models\User::firstOrCreate(
            ['username' => 'FISHOL'],
            [
                'name' => 'Fishol',
                'password' => bcrypt('password'),
                'role' => 'Operator'
            ]
        );

        $grade = \App\Models\Grade::firstOrCreate(['grade' => 'SPECTA - TK4']);
        $gsm = \App\Models\Gsm::firstOrCreate(['gsm' => 420]);
        $plybond = \App\Models\Plybond::firstOrCreate(['plybonds' => 400]);
        $thickness = \App\Models\Thickness::firstOrCreate(['thickness' => 600]);
        $width = \App\Models\RollsWidth::firstOrCreate(['width' => 1133]);
        $diameter = \App\Models\RollsDiameter::firstOrCreate(['diameter' => 1150]);
        $core = \App\Models\Core::firstOrCreate(['core' => '3']);
        $cobb = \App\Models\Cobb::firstOrCreate(['cobb' => '100-150']);
        $location = \App\Models\Location::firstOrCreate(
            ['location' => 'E17-1-1'],
            ['status' => 1]
        );
        $shift = \App\Models\Shift::firstOrCreate(['shift' => 'Shift 1']);
        $customer = \App\Models\Customer::firstOrCreate(['customer' => 'Dummy Customer']);

        $jop = \App\Models\Jop::firstOrCreate(
            ['jop' => 'JOP-0726-00028'],
            [
                'spk' => 'SPK-001',
                'po' => 'PO-001',
                'quantity' => 1,
                'weight' => 931,
                'container' => 1,
                'customers_id' => $customer->id,
                'grades_id' => $grade->id,
                'gsms_id' => $gsm->id,
                'rolls_widths_id' => $width->id,
            ]
        );

        $maxNo = \App\Models\Roll::max('no') ?? 0;

        \App\Models\Roll::firstOrCreate(
            ['no_roll' => '260731-11.04.04'],
            [
                'no' => $maxNo + 1,
                'form' => 1,
                'shifts_id' => $shift->id,
                'entry_date' => '2026-07-31',
                'grades_id' => $grade->id,
                'plybonds_id' => $plybond->id,
                'thicknesses_id' => $thickness->id,
                'bulk' => 1.4,
                'rolls_diameters_id' => $diameter->id,
                'weight' => 931,
                'cores_id' => $core->id,
                'cobbs_id' => $cobb->id,
                'exmaterial' => 'IMPORT',
                'locations_id' => $location->id,
                'visual' => '0',
                'users_id' => $user->id,
                'jops_id' => $jop->id,
            ]
        );

        if ($location->status != 1) {
            $location->update(['status' => 1]);
        }
    }
}
