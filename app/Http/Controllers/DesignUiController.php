<?php

namespace App\Http\Controllers;

use App\Models\Location;
use App\Models\Roll;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DesignUiController extends Controller
{
    public function login() { return Inertia::render('Login'); }

    public function warehouseMap()
    {
        $locations = Location::with(['rolls' => function($query) {
            $query->latest('created_at');
        }])->get();
        return Inertia::render('WarehouseMap', ['locations' => $locations]);
    }

    public function slotStatus()
    {
        $locations = Location::all();
        return Inertia::render('SlotStatus', ['locations' => $locations]);
    }

    public function incomingRoll() { 
        $jops = \App\Models\Jop::with(['customer', 'grade', 'gsm', 'rollsWidth'])->latest()->get();
        return Inertia::render('IncomingRoll', ['jopList' => $jops]); 
    }
    public function ocrMonitoring() { return Inertia::render('OcrMonitoring'); }
    public function targetOrder() { 
        $orders = \App\Models\Jop::with(['customer', 'grade', 'gsm', 'rollsWidth'])->latest()->get();
        return Inertia::render('TargetOrder', ['targetOrders' => $orders]); 
    }
    public function jop() { 
        $orders = \App\Models\Jop::with(['customer', 'grade', 'rolls'])->latest()->get();
        return Inertia::render('Jop', ['jopData' => $orders]); 
    }
    public function spkPo() { 
        $orders = \App\Models\Jop::with(['customer', 'grade', 'rolls'])->latest()->get();
        return Inertia::render('SpkPo', ['spkPoData' => $orders]); 
    }
    public function reports() { return Inertia::render('Reports'); }
    public function profile() { return Inertia::render('Profile'); }
    public function notifications() { return Inertia::render('Notifications'); }
}
