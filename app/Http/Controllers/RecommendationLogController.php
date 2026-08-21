<?php

namespace App\Http\Controllers;

use App\Models\LocationRecommendationLog;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RecommendationLogController extends Controller
{
    public function index(Request $request)
    {
        // Enforce admin-only access
        if (strtolower(auth()->user()->role ?? '') !== 'admin') {
            abort(403, 'Unauthorized access. Administrator role is required to view recommendation logs.');
        }

        $logsQuery = LocationRecommendationLog::with([
            'roll',
            'user',
            'previousLocation',
            'recommendedLocation',
            'selectedLocation',
        ])->orderBy('created_at', 'desc')->orderBy('id', 'desc');

        $logs = $logsQuery->get()->map(function ($log) {
            return [
                'id' => $log->id,
                'rolls_no' => $log->rolls_no,
                'no_roll' => $log->no_roll ?? ($log->roll->no_roll ?? 'R-' . $log->rolls_no),
                'user_name' => $log->user->username ?? 'Unknown Operator',
                'user_email' => $log->user->email ?? '—',
                'action_type' => $log->action_type,
                'previous_location' => $log->previousLocation->location ?? ($log->action_type === 'ASSIGN' ? 'None (New)' : '—'),
                'previous_location_id' => $log->previous_locations_id,
                'recommended_location' => $log->recommendedLocation->location ?? '—',
                'recommended_location_id' => $log->recommended_locations_id,
                'selected_location' => $log->selectedLocation->location ?? '—',
                'selected_location_id' => $log->selected_locations_id,
                'is_match' => (bool)$log->is_match,
                'status_code' => $log->is_match ? 1 : 0,
                'notes' => $log->notes ?? '',
                'created_at' => $log->created_at ? $log->created_at->timezone('Asia/Jakarta')->format('Y-m-d H:i:s') : '—',
                'created_date' => $log->created_at ? $log->created_at->timezone('Asia/Jakarta')->format('Y-m-d') : '—',
                'created_time' => $log->created_at ? $log->created_at->timezone('Asia/Jakarta')->format('H:i:s') : '—',
            ];
        });

        // Compute statistics for evaluation dashboard
        $totalLogs = $logs->count();
        $matchCount = $logs->where('is_match', true)->count();
        $overrideCount = $logs->where('is_match', false)->count();
        $overallRate = $totalLogs > 0 ? round(($matchCount / $totalLogs) * 100, 1) : 0;

        $assignLogs = $logs->where('action_type', 'ASSIGN');
        $assignTotal = $assignLogs->count();
        $assignMatch = $assignLogs->where('is_match', true)->count();
        $assignRate = $assignTotal > 0 ? round(($assignMatch / $assignTotal) * 100, 1) : 0;

        $moveLogs = $logs->where('action_type', 'MOVE');
        $moveTotal = $moveLogs->count();
        $moveMatch = $moveLogs->where('is_match', true)->count();
        $moveRate = $moveTotal > 0 ? round(($moveMatch / $moveTotal) * 100, 1) : 0;

        $stats = [
            'total_evaluations' => $totalLogs,
            'match_count' => $matchCount,
            'override_count' => $overrideCount,
            'overall_match_rate' => $overallRate,
            'assign_total' => $assignTotal,
            'assign_match_rate' => $assignRate,
            'move_total' => $moveTotal,
            'move_match_rate' => $moveRate,
        ];

        return Inertia::render('RecommendationLogs', [
            'logs' => $logs,
            'stats' => $stats,
        ]);
    }
}
