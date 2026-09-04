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
        $jops = \App\Models\Jop::with(['customer', 'grade', 'gsm', 'rollsWidth', 'plybond', 'thickness', 'core', 'rolls'])->latest()->get();

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
        $orders = \App\Models\Jop::with(['customer', 'grade', 'gsm', 'rollsWidth', 'plybond', 'thickness', 'core', 'rolls'])->latest()->get();
        return Inertia::render('TargetOrder', ['targetOrders' => $orders]); 
    }
    public function jop() { 
        $orders = \App\Models\Jop::with([
            'customer',
            'grade',
            'gsm',
            'plybond',
            'thickness',
            'core',
            'rollsWidth',
            'rolls.grade',
            'rolls.gsm',
            'rolls.shift',
            'rolls.thickness',
            'rolls.core',
            'rolls.rollsWidth',
            'rolls.rollsDiameter',
            'rolls.plybond',
            'rolls.cobb',
            'rolls.location',
            'rolls.user',
        ])->latest()->get();
        return Inertia::render('Jop', ['jopData' => $orders]); 
    }
    public function spkPo() { 
        $orders = \App\Models\Jop::with(['customer', 'grade', 'rolls'])->latest()->get();
        return Inertia::render('SpkPo', ['spkPoData' => $orders]); 
    }
    public function reports(\Illuminate\Http\Request $request)
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

        $historyDate = $request->input('history_date');
        $historyShift = $request->input('history_shift');
        $productionQuery = Roll::with('shift')
            ->selectRaw('entry_date, shifts_id, count(*) as total_rolls, sum(weight) as total_weight')
            ->groupBy('entry_date', 'shifts_id');
            
        if ($historyDate) {
            $productionQuery->whereDate('entry_date', $historyDate);
        }

        if ($historyShift && $historyShift !== 'all') {
            $productionQuery->where('shifts_id', $historyShift);
        }

        $allShifts = \App\Models\Shift::select('id', 'shift')->orderBy('shift')->get();

        $productionHistory = $productionQuery
            ->orderBy('entry_date', 'desc')
            ->orderBy('shifts_id', 'asc')
            ->limit(50)
            ->get()
            ->map(function ($item) {
                return [
                    'date' => $item->entry_date ? \Carbon\Carbon::parse($item->entry_date)->format('Y-m-d') : '—',
                    'shift' => $item->shift->shift ?? '—',
                    'shifts_id' => $item->shifts_id,
                    'total_rolls' => $item->total_rolls,
                    'total_weight' => $item->total_weight ?? 0,
                ];
            });

        // Shipments for outgoing shipments section
        $shipments = \App\Models\Shipment::with([
            'customer', 
            'admin', 
            'qc', 
            'shipmentRolls.roll.grade',
            'shipmentRolls.roll.jop',
            'shipmentRolls.roll.gsm'
        ])
        ->orderBy('created_at', 'desc')
        ->limit(20)
        ->get()
        ->map(function ($shipment) {
            return [
                'id' => $shipment->id,
                'shipment_number' => $shipment->shipment_number,
                'customer' => $shipment->customer->customer ?? '—',
                'admin' => $shipment->admin->username ?? '—',
                'qc' => $shipment->qc->username ?? '—',
                'date' => $shipment->shipment_date,
                'status' => $shipment->status,
                'total_rolls' => $shipment->shipmentRolls->count(),
                'rolls' => $shipment->shipmentRolls->map(function ($sr) {
                    $r = $sr->roll;
                    if (!$r) return null;
                    return [
                        'no_roll' => $r->no_roll ?? ('R-' . $r->no),
                        'jop' => $r->jop->jop ?? '—',
                        'grade' => $r->grade->grade ?? '—',
                        'gsm' => $r->gsm->gsm ?? ($r->jop->gsm->gsm ?? '—'),
                        'weight' => $r->weight ?? 0,
                        'entry_date' => $r->entry_date,
                        'qc_status' => $sr->qc_status,
                        'qc_notes' => $sr->qc_notes,
                    ];
                })->filter()
            ];
        });

        return Inertia::render('Reports', [
            'kpis' => $kpis,
            'warehouseData' => $warehouseData,
            'statusDistribution' => $statusDistribution,
            'ocrActivity' => $ocrActivity,
            'demandForecast' => $demandForecast,
            'shipments' => $shipments,
            'productionHistory' => $productionHistory,
            'currentDate' => $historyDate,
            'currentShift' => $historyShift ?: '',
            'shifts' => $allShifts,
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
