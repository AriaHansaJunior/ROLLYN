<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Roll;
use App\Models\Jop;
use Illuminate\Http\Request;
use App\Traits\ApiResponse;
use Illuminate\Support\Carbon;

class AnalyticsController extends Controller
{
    use ApiResponse;

    public function dashboardSummary(Request $request)
    {
        $today = Carbon::today()->toDateString();

        $rollsTodayQuery = Roll::whereDate('entry_date', $today);

        $totalRollsToday = clone $rollsTodayQuery;
        $totalWeightToday = clone $rollsTodayQuery;

        $activeJops = Jop::where(function ($q) {
            $q->has('rolls', '<', \DB::raw('jops.quantity'))
              ->orWhereNull('quantity');
        })->count();

        $shiftDistribution = clone $rollsTodayQuery;
        $shiftDistribution = $shiftDistribution->selectRaw('shifts_id, count(*) as total')
                                               ->with('shift:id,shift')
                                               ->groupBy('shifts_id')
                                               ->get()
                                               ->map(function ($item) {
                                                   return [
                                                       'shift' => $item->shift->shift ?? 'Unknown',
                                                       'total' => $item->total
                                                   ];
                                               });

        return $this->successResponse([
            'today_date' => $today,
            'total_rolls_today' => $totalRollsToday->count(),
            'total_weight_today_kg' => $totalWeightToday->sum('weight'),
            'active_jops' => $activeJops,
            'shift_distribution' => $shiftDistribution
        ], 'Dashboard summary retrieved successfully');
    }

    public function rollReports(Request $request)
    {
        $query = Roll::with(['shift', 'grade', 'jop']);

        if ($dateFrom = $request->query('date_from')) {
            $query->whereDate('entry_date', '>=', $dateFrom);
        }
        if ($dateTo = $request->query('date_to')) {
            $query->whereDate('entry_date', '<=', $dateTo);
        }
        if ($gradeId = $request->query('grade_id')) {
            $query->where('grades_id', $gradeId);
        }
        if ($jopId = $request->query('jop_id')) {
            $query->where('jops_id', $jopId);
        }

        $sort = $request->query('sort', 'entry_date');
        $order = $request->query('order', 'desc');

        $query->orderBy($sort, $order);

        $limit = $request->query('limit', 20);

        return $this->successResponse($query->paginate($limit), 'Roll reports retrieved successfully');
    }

    public function exportExcel(Request $request)
    {
        $query = Roll::with(['shift', 'grade', 'jop', 'user']);

        if ($dateFrom = $request->input('date_from')) {
            $query->whereDate('entry_date', '>=', $dateFrom);
        }
        if ($dateTo = $request->input('date_to')) {
            $query->whereDate('entry_date', '<=', $dateTo);
        }
        if ($gradeId = $request->input('grade_id')) {
            $query->where('grades_id', $gradeId);
        }
        if ($jopId = $request->input('jop_id')) {
            $query->where('jops_id', $jopId);
        }

        $rolls = $query->orderBy('entry_date', 'desc')->get();

        $filename = "rolls_export_" . date('Ymd_His') . ".csv";

        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=$filename",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $columns = [
            'No', 'No Roll', 'Entry Date', 'Shift', 'Grade', 'Weight (Kg)', 'JOP/SPK', 'ExMaterial', 'Operator'
        ];

        $callback = function() use($rolls, $columns) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);

            foreach ($rolls as $roll) {
                fputcsv($file, [
                    $roll->no,
                    $roll->no_roll,
                    $roll->entry_date,
                    $roll->shift->shift ?? '-',
                    $roll->grade->grade ?? '-',
                    $roll->weight,
                    $roll->jop->jop ?? ($roll->jop->spk ?? '-'),
                    $roll->exmaterial,
                    $roll->user->username ?? '-'
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
