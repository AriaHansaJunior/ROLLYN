<?php
namespace App\Http\Controllers;

use App\Models\Jop;
use Illuminate\Http\Request;

class JopController extends Controller
{
    public function index()
    {
        $jops = Jop::with(['customer', 'grade', 'gsm', 'rollsWidth'])->get();
        return response()->json($jops);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'spk' => 'required',
            'jop' => 'required',
            'po' => 'required',
            'customers_id' => 'required|exists:customers,id',
            'grades_id' => 'required|exists:grades,id',
            'gsms_id' => 'required|exists:gsms,id',
            'rolls_widths_id' => 'nullable|exists:rolls_widths,id',
            'quantity' => 'nullable|integer',
            'weight' => 'nullable|integer',
            'container' => 'nullable|integer',
            'noted_order' => 'nullable|string'
        ]);

        $jop = Jop::create($validated);
        return response()->json(['message' => 'JOP created successfully', 'data' => $jop]);
    }

    public function update(Request $request, $id)
    {
        $jop = Jop::findOrFail($id);

        $validated = $request->validate([
            'spk' => 'required',
            'jop' => 'required',
            'po' => 'required',
            'customers_id' => 'required|exists:customers,id',
            'grades_id' => 'required|exists:grades,id',
            'gsms_id' => 'required|exists:gsms,id',
            'rolls_widths_id' => 'nullable|exists:rolls_widths,id',
            'quantity' => 'nullable|integer',
            'weight' => 'nullable|integer',
            'container' => 'nullable|integer',
            'noted_order' => 'nullable|string'
        ]);

        $jop->update($validated);
        return response()->json(['message' => 'JOP updated successfully', 'data' => $jop]);
    }

    public function destroy($id)
    {
        $jop = Jop::findOrFail($id);
        $jop->delete();
        return response()->json(['message' => 'JOP deleted successfully']);
    }

    public function getActive()
    {
        return response()->json(Jop::all());
    }

    public function getDetails($id)
    {
        $jop = Jop::with(['grade', 'gsm', 'rollsWidth'])->findOrFail($id);
        return response()->json($jop);
    }
}
