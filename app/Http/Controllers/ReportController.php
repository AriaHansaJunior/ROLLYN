<?php
namespace App\Http\Controllers;

use App\Models\Roll;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $query = Roll::with(['shift', 'grade', 'plybond', 'thickness', 'core', 'cobb', 'location', 'user', 'jop']);

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('entry_date', [$request->start_date, $request->end_date]);
        }

        if ($request->filled('shifts_id')) {
            $query->where('shifts_id', $request->shifts_id);
        }

        if ($request->filled('grades_id')) {
            $query->where('grades_id', $request->grades_id);
        }

        $rolls = $query->paginate(20);

        return Inertia::render('Reports', [
            'rolls' => $rolls,
            'filters' => $request->all()
        ]);
    }

    public function export()
    {
        return response()->json(['message' => 'Export feature coming soon']);
    }
}
