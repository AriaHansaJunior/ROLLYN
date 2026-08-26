<?php

namespace App\Http\Controllers;

use App\Models\Location;
use Illuminate\Http\Request;

class LocationController extends Controller
{
    public function update(Request $request, $id)
    {
        $location = Location::find($id);
        
        if (!$location) {
            return redirect()->back()->with('error', 'Location not found.');
        }

        $validated = $request->validate([
            'status' => 'nullable|integer',
        ]);

        $location->update($validated);

        return redirect()->back()->with('success', 'Location updated successfully.');
    }
    public function bulkUpdate(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:locations,id',
            'status' => 'nullable|integer',
        ]);

        $updateData = $request->only(['status']);

        if (!empty($updateData)) {
            Location::whereIn('id', $validated['ids'])->update($updateData);
        }

        return redirect()->back()->with('success', 'Locations updated successfully.');
    }
}
