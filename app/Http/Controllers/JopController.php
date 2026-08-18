<?php

namespace App\Http\Controllers;

use App\Models\Jop;
use App\Models\Customer;
use App\Models\Grade;
use App\Models\Gsm;
use Illuminate\Http\Request;

class JopController extends Controller
{
    public function index()
    {
        $jops = Jop::with(['customer', 'grade', 'gsm', 'rollsWidth'])->get();
        return response()->json($jops);
    }

    public function masterData()
    {
        return response()->json([
            'customers' => Customer::select('id', 'customer')->orderBy('customer')->get(),
            'grades'    => Grade::select('id', 'grade')->orderBy('grade')->get(),
            'gsms'      => Gsm::select('id', 'gsm')->orderBy('gsm')->get(),
        ]);
    }

    public function store(Request $request)
    {
        // 1. Resolve custom manual input strings if user selected "+ Add New / Input Manual..."
        if ($request->filled('custom_customer')) {
            $cust = Customer::firstOrCreate(['customer' => trim($request->custom_customer)]);
            $request->merge(['customers_id' => $cust->id]);
        }
        if ($request->filled('custom_grade')) {
            $gr = Grade::firstOrCreate(['grade' => trim($request->custom_grade)]);
            $request->merge(['grades_id' => $gr->id]);
        }
        if ($request->filled('custom_gsm')) {
            $gsm = Gsm::firstOrCreate(['gsm' => floatval($request->custom_gsm)]);
            $request->merge(['gsms_id' => $gsm->id]);
        }

        $validated = $request->validate([
            'spk' => 'required|string|max:45|unique:jops,spk',
            'jop' => 'required|string|max:45|unique:jops,jop',
            'po' => 'required|string|max:45',
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
        $jop->load(['customer', 'grade', 'gsm']);

        return response()->json([
            'status' => 'success',
            'message' => 'JOP created successfully',
            'data' => $jop
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $jop = Jop::findOrFail($id);

        if ($request->filled('custom_customer')) {
            $cust = Customer::firstOrCreate(['customer' => trim($request->custom_customer)]);
            $request->merge(['customers_id' => $cust->id]);
        }
        if ($request->filled('custom_grade')) {
            $gr = Grade::firstOrCreate(['grade' => trim($request->custom_grade)]);
            $request->merge(['grades_id' => $gr->id]);
        }
        if ($request->filled('custom_gsm')) {
            $gsm = Gsm::firstOrCreate(['gsm' => floatval($request->custom_gsm)]);
            $request->merge(['gsms_id' => $gsm->id]);
        }

        $validated = $request->validate([
            'spk' => 'required|string|max:45|unique:jops,spk,' . $id,
            'jop' => 'required|string|max:45|unique:jops,jop,' . $id,
            'po' => 'required|string|max:45',
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
