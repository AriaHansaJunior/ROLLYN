<?php
namespace App\Http\Controllers;

use App\Models\Roll;
use App\Models\Jop;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        $today = Carbon::today();

        $totalRolls = Roll::count();
        $totalWeight = Roll::sum('weight');
        $receivedToday = Roll::whereDate('entry_date', $today)->count();

        $occupiedSlots = \App\Models\Location::where('status', 1)->count();
        $totalSlots = \App\Models\Location::count();
        $availableSlots = $totalSlots - $occupiedSlots;

        $activeJops = Jop::count();

        $warehouseData = [
            [
                'id' => 'E17',
                'total' => $totalSlots,
                'occupied' => $occupiedSlots,
                'available' => $availableSlots,
                'shipment' => 0,
                'nonPO' => 0,
                'moveWH' => 0,
                'hold' => 0,
            ]
        ];

        return Inertia::render('Dashboard', [
            'stats' => [
                'total_rolls' => $totalRolls,
                'total_weight' => round($totalWeight, 1),
                'received_today' => $receivedToday,
                'occupied_slots' => $occupiedSlots,
                'total_slots' => $totalSlots,
                'available_slots' => $availableSlots,
                'active_jops' => $activeJops,
            ],
            'warehouseData' => $warehouseData,
            'alerts' => [

                [
                    'id' => 1,
                    'type' => 'info',
                    'title' => 'System Online',
                    'message' => 'Roll inventory system is tracking live data.',
                    'time' => now()->format('H:i')
                ]
            ],
            'demandForecast' => [

                ['month' => 'Jan', 'actual' => 0, 'forecast' => 0]
            ]
        ]);
    }
}
