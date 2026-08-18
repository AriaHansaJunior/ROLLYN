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
    
    public function incomingRoll() { return Inertia::render('IncomingRoll'); }
    public function ocrMonitoring() { return Inertia::render('OcrMonitoring'); }
    public function targetOrder() { return Inertia::render('TargetOrder'); }
    public function jop() { return Inertia::render('Jop'); }
    public function spkPo() { return Inertia::render('SpkPo'); }
    public function reports() { return Inertia::render('Reports'); }
    public function profile() { return Inertia::render('Profile'); }
    public function notifications() { return Inertia::render('Notifications'); }
}
