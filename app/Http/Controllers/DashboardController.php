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
        
        // Location stats
        $occupiedSlots = \App\Models\Location::where('status', 1)->count();
        $totalSlots = \App\Models\Location::count();
        $availableSlots = $totalSlots - $occupiedSlots;
        
        $activeJops = Jop::count(); 
        
        // Warehouse condition summary
        // For now, group all as 'E17' since they are all E17
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
                // Minimal dummy alerts or empty, since we don't have an alerts table yet
                [
                    'id' => 1,
                    'type' => 'info',
                    'title' => 'System Online',
                    'message' => 'Roll inventory system is tracking live data.',
                    'time' => now()->format('H:i')
                ]
            ],
            'demandForecast' => [
                // Minimal placeholder for the chart to not break
                ['month' => 'Jan', 'actual' => 0, 'forecast' => 0]
            ]
        ]);
    }
}
