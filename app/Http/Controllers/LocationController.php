<?php

namespace App\Http\Controllers;

use App\Models\Location;
use App\Models\Roll;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LocationController extends Controller
{
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
                    'date' => $r->entry_date ? Carbon::parse($r->entry_date)->format('Y-m-d') : '—',
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

    public function update(Request $request, $id)
    {
        $location = Location::find($id);
        
        if (!$location) {
            return redirect()->back()->with('error', 'Location not found.');
        }

        $validated = $request->validate([
            'status' => 'nullable|integer|between:0,6',
        ]);

        $location->update($validated);

        return redirect()->back()->with('success', 'Location updated successfully.');
    }

    public function bulkUpdate(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:locations,id',
            'status' => 'nullable|integer|between:0,6',
        ]);

        $updateData = $request->only(['status']);

        if (!empty($updateData)) {
            Location::whereIn('id', $validated['ids'])->update($updateData);
        }

        return redirect()->back()->with('success', 'Locations updated successfully.');
    }
}
