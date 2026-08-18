<?php
namespace App\Http\Controllers;

use App\Models\Roll;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class IncomingRollController extends Controller
{
    public function step1(Request $request)
    {
        $request->validate(['weight' => 'required|numeric']);
        session(['incoming_roll_weight' => $request->weight]);
        return response()->json(['message' => 'Weight saved temporarily']);
    }

    public function step2()
    {
        return response()->json(['weight' => session('incoming_roll_weight')]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'no' => 'required|integer|unique:rolls,no',
            'no_roll' => 'required|string|unique:rolls,no_roll',
            'form' => 'nullable|integer',
            'shifts_id' => 'required|exists:shifts,id',
            'entry_date' => 'required|date',
            'jops_id' => 'nullable|exists:jops,id',
            'grades_id' => 'required|exists:grades,id',
            'plybonds_id' => 'nullable|exists:plybonds,id',
            'thicknesses_id' => 'nullable|exists:thicknesses,id',
            'cores_id' => 'nullable|exists:cores,id',
            'cobbs_id' => 'nullable|exists:cobbs,id',
            'exmaterial' => 'required|in:IMPORT,LOCAL',
            'visual' => 'nullable|string',
            'weight' => 'required|integer',
        ]);

        $bulk = null;
        if (!empty($validated['thicknesses_id']) && !empty($request->gsm_value)) {
            $bulk = $request->thickness_value / $request->gsm_value;
        }

        DB::beginTransaction();
        try {
            $validated['bulk'] = $bulk;
            $validated['users_id'] = auth()->id();

            $roll = Roll::create($validated);

            DB::commit();
            session()->forget('incoming_roll_weight');

            return response()->json(['message' => 'Roll saved successfully', 'data' => $roll]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to save roll: ' . $e->getMessage()], 500);
        }
    }
}
