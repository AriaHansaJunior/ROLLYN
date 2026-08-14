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
        
        $totalRollsToday = Roll::whereDate('entry_date', $today)->count();
        $totalWeightToday = Roll::whereDate('entry_date', $today)->sum('weight');
        $activeJops = Jop::count(); 
        
        return Inertia::render('Dashboard', [
            'stats' => [
                'total_rolls_today' => $totalRollsToday,
                'total_weight_today' => $totalWeightToday,
                'active_jops' => $activeJops,
            ]
        ]);
    }
}
