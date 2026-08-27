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
            $query->with(['grade', 'jop.gsm', 'jop.rollsWidth'])->latest('created_at');
        }])->get();

        $unslottedRolls = Roll::whereNull('locations_id')
            ->with(['grade', 'jop.gsm', 'jop.rollsWidth', 'shift'])
            ->orderBy('entry_date', 'desc')
            ->orderBy('no', 'desc')
            ->get()
            ->map(function ($r) {
                return [
                    'id' => $r->no_roll ?? ('R-' . $r->no),
                    'raw_id' => $r->no,
                    'no_roll' => $r->no_roll,
                    'grade' => $r->grade->grade ?? '—',
                    'gsm' => $r->jop->gsm->gsm ?? ($r->gsm ?? 150),
                    'weight' => $r->weight ?? 0,
                    'date' => $r->entry_date ? \Carbon\Carbon::parse($r->entry_date)->format('Y-m-d') : '—',
                    'jop' => $r->jop->jop ?? '—',
                ];
            });

        return Inertia::render('WarehouseMap', [
            'locations' => $locations,
            'unslottedRolls' => $unslottedRolls,
        ]);
    }

    public function slotStatus()
    {
        $locations = Location::with(['rolls' => function($query) {
            $query->with(['grade', 'jop.gsm', 'jop.rollsWidth'])->latest('created_at');
        }])->get();
        return Inertia::render('SlotStatus', ['locations' => $locations]);
    }

    public function incomingRoll() { 
        $jops = \App\Models\Jop::with(['customer', 'grade', 'gsm', 'rollsWidth'])->latest()->get();

        // Auto-start SPECTRUM Engine if it's not running
        $connection = @fsockopen('127.0.0.1', 8001, $errno, $errstr, 1);
        if (is_resource($connection)) {
            fclose($connection);
        } else {
            $engineDir = base_path('spectrum_engine');
            try {
                if (class_exists('COM')) {
                    $shell = new \COM("WScript.Shell");
                    $cmd = "cmd /c cd /d " . escapeshellarg($engineDir) . " && python -m uvicorn app:app --host 127.0.0.1 --port 8001";
                    $shell->Run($cmd, 0, false); // 0 = hidden window, false = do not wait
                } else {
                    exec('start "" /B cmd /c "cd /d ' . escapeshellarg($engineDir) . ' && python -m uvicorn app:app --host 127.0.0.1 --port 8001 > NUL 2>&1"');
                }
            } catch (\Throwable $e) {
                exec('start "" /B cmd /c "cd /d ' . escapeshellarg($engineDir) . ' && python -m uvicorn app:app --host 127.0.0.1 --port 8001 > NUL 2>&1"');
            }
            // Add a brief delay to allow the engine to start
            usleep(500000); // 500ms
        }

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
    public function reports()
    {
        $totalRolls = Roll::count();
        $totalWeight = Roll::sum('weight');
        $occupiedSlots = Location::where('status', 1)->count();
        $totalSlots = Location::count();
        $availableSlots = $totalSlots - $occupiedSlots;
        $activeJops = \App\Models\Jop::count();

        $kpis = [
            ['label' => 'Total Rolls', 'value' => $totalRolls],
            ['label' => 'Total Weight (kg)', 'value' => number_format($totalWeight, 0)],
            ['label' => 'Occupied Slots', 'value' => $occupiedSlots],
            ['label' => 'Available Slots', 'value' => $availableSlots],
            ['label' => 'Active JOPs', 'value' => $activeJops],
            ['label' => 'Utilization', 'value' => $totalSlots > 0 ? round(($occupiedSlots / $totalSlots) * 100) . '%' : '0%'],
        ];

        $warehouseData = [
            [
                'id' => 'Kolom A',
                'occupied' => $occupiedSlots,
                'available' => $availableSlots,
            ]
        ];

        // Status distribution based on actual derived status logic
        $slottedCount = Roll::whereNotNull('locations_id')->count();
        $shipmentPlanCount = Roll::whereNull('locations_id')->whereNotNull('jops_id')->count();
        $incomingCount = Roll::whereNull('locations_id')->whereNull('jops_id')->count();

        $statusDistribution = [
            ['name' => 'Slotted', 'value' => $slottedCount, 'color' => '#2563EB'],
            ['name' => 'Shipment Plan', 'value' => $shipmentPlanCount, 'color' => '#16A34A'],
            ['name' => 'Incoming', 'value' => $incomingCount, 'color' => '#F59E0B'],
        ];

        // OCR activity: rolls created in the last 7 days grouped by day
        $ocrActivity = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $dayCount = Roll::whereDate('created_at', $date->toDateString())->count();
            $ocrActivity[] = [
                'day' => $date->format('D'),
                'success' => $dayCount,
                'error' => 0,
            ];
        }

        // Demand forecast placeholder (actual data not available)
        $demandForecast = [];

        // Outgoing shipment rolls: have JOP but no warehouse location (derived status = Shipment Plan)
        $outgoingRolls = Roll::with(['jop.customer', 'jop.gsm', 'grade'])
            ->whereNotNull('jops_id')
            ->whereNull('locations_id')
            ->orderBy('entry_date', 'desc')
            ->get()
            ->map(function ($roll) {
                return [
                    'id' => $roll->no,
                    'no_roll' => $roll->no_roll ?? ('R-' . $roll->no),
                    'jop' => $roll->jop->jop ?? '—',
                    'customer' => $roll->jop->customer->customer ?? '—',
                    'grade' => $roll->grade->grade ?? '—',
                    'gsm' => $roll->jop->gsm->gsm ?? '—',
                    'weight' => $roll->weight ?? 0,
                    'entry_date' => $roll->entry_date ? \Carbon\Carbon::parse($roll->entry_date)->format('Y-m-d') : '—',
                    'status' => 'Shipment Plan',
                ];
            });

        return Inertia::render('Reports', [
            'kpis' => $kpis,
            'warehouseData' => $warehouseData,
            'statusDistribution' => $statusDistribution,
            'ocrActivity' => $ocrActivity,
            'demandForecast' => $demandForecast,
            'outgoingRolls' => $outgoingRolls,
        ]);
    }
    public function profile() { return Inertia::render('Profile'); }
    public function notifications()
    {
        $notifications = \App\Models\SystemNotification::orderBy('created_at', 'desc')->get()->map(function ($notif) {
            return [
                'id' => $notif->id,
                'type' => $notif->type,
                'title' => $notif->title,
                'message' => $notif->message,
                'time' => $notif->created_at->diffForHumans(),
                'unread' => $notif->is_unread,
            ];
        });

        return Inertia::render('Notifications', ['notifications' => $notifications]);
    }

    public function readAllNotifications()
    {
        \App\Models\SystemNotification::where('is_unread', true)->update(['is_unread' => false]);
        return redirect()->back()->with('success', 'All notifications marked as read.');
    }
}
