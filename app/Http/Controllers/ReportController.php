<?php

namespace App\Http\Controllers;

use App\Models\Roll;
use App\Models\Location;
use App\Models\Jop;
use App\Models\Shift;
use App\Models\Shipment;
use App\Models\JumboRoll;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $totalRolls = Roll::count();
        $totalWeight = Roll::sum('weight');
        $occupiedSlots = Location::where('status', 1)->count();
        $totalSlots = Location::count();
        $availableSlots = $totalSlots - $occupiedSlots;
        $activeJops = Jop::count();

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
                'id' => 'Column A',
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

        $allShifts = Shift::select('id', 'shift')->orderBy('shift')->get();

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
        $shipments = Shipment::with([
            'customers',
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
                'customer' => $shipment->customers->pluck('customer')->join(', ') ?: '—',
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

    public function export()
    {
        return response()->json(['message' => 'Export feature coming soon']);
    }

    public function logs(Request $request)
    {
        $type = $request->query('type', 'jumbo');

        if ($type === 'jumbo') {
            $data = JumboRoll::with(['jop.grade', 'jop.gsm', 'rolls'])
                        ->orderBy('created_at', 'desc')
                        ->limit(200)
                        ->get()
                        ->map(function($j) {
                            return [
                                'id' => $j->id,
                                'number' => $j->jumbo_roll_number,
                                'grade' => $j->jop->grade->grade ?? '-',
                                'gsm' => $j->jop->gsm->gsm ?? '-',
                                'target_weight' => $j->weight,
                                'actual_weight' => $j->total_cut_weight,
                                'status' => $j->status,
                                'date' => $j->created_at->format('Y-m-d H:i')
                            ];
                        });
            return response()->json($data);
        }

        if ($type === 'jop') {
            $data = Jop::with(['customer', 'grade', 'gsm', 'rolls'])
                        ->orderBy('created_at', 'desc')
                        ->limit(200)
                        ->get()
                        ->map(function($j) {
                            $actual = $j->rolls->sum('weight') / 1000; // ton
                            $target = $j->weight ?? 0;
                            $status = ($actual >= $target && $target > 0) ? 'Completed' : 'In Progress';
                            if ($j->production_estimation && isset($j->production_estimation['is_completed']) && $j->production_estimation['is_completed']) {
                                $status = 'Completed';
                            }
                            return [
                                'id' => $j->id,
                                'number' => $j->jop,
                                'customer' => $j->customer->customer ?? '-',
                                'grade' => $j->grade->grade ?? '-',
                                'gsm' => $j->gsm->gsm ?? '-',
                                'target_weight' => $target,
                                'actual_weight' => $actual,
                                'status' => $status,
                                'date' => $j->created_at->format('Y-m-d H:i')
                            ];
                        });
            return response()->json($data);
        }

        if ($type === 'reproduction') {
            $data = Roll::with(['grade', 'gsm', 'jop'])
                        ->whereNotNull('reproduction_status')
                        ->where('reproduction_status', '!=', 'None (Standard Production)')
                        ->orderBy('updated_at', 'desc')
                        ->limit(200)
                        ->get()
                        ->map(function($r) {
                            return [
                                'id' => $r->no,
                                'number' => $r->no_roll ?? ('R-'.$r->no),
                                'jop' => $r->jop->jop ?? '-',
                                'grade' => $r->grade->grade ?? '-',
                                'gsm' => $r->gsm->gsm ?? '-',
                                'weight' => $r->weight,
                                'status' => $r->reproduction_status,
                                'date' => $r->updated_at->format('Y-m-d H:i')
                            ];
                        });
            return response()->json($data);
        }

        return response()->json([]);
    }
}
