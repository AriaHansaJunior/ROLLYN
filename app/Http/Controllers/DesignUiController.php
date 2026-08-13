<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class DesignUiController extends Controller
{
    public function login() { return Inertia::render('Login'); }
    public function dashboard() { return Inertia::render('Dashboard'); }
    public function warehouseMap() { return Inertia::render('WarehouseMap'); }
    public function rollInventory() { return Inertia::render('RollInventory'); }
    public function rollDetail() { return Inertia::render('RollDetail'); }
    public function slotStatus() { return Inertia::render('SlotStatus'); }
    public function incomingRoll() { return Inertia::render('IncomingRoll'); }
    public function ocrMonitoring() { return Inertia::render('OcrMonitoring'); }
    public function targetOrder() { return Inertia::render('TargetOrder'); }
    public function jop() { return Inertia::render('Jop'); }
    public function spkPo() { return Inertia::render('SpkPo'); }
    public function reports() { return Inertia::render('Reports'); }
    public function userManagement() { return Inertia::render('UserManagement'); }
    public function profile() { return Inertia::render('Profile'); }
    public function notifications() { return Inertia::render('Notifications'); }
}
