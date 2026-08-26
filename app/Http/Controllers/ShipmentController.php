<?php

namespace App\Http\Controllers;

use App\Models\Shipment;
use App\Models\ShipmentRoll;
use App\Models\Roll;
use App\Models\Location;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class ShipmentController extends Controller
{
    // Redirect to integrated Roll Inventory shipments tab
    public function index()
    {
        return redirect('/roll-inventory?tab=shipments');
    }

    // For Admin to create a new shipment
    public function store(Request $request)
    {
        $request->validate([
            'customers_id' => 'required|exists:customers,id',
            'qc_users_id' => 'required|exists:users,id',
            'rolls' => 'required|array|min:1',
            'shipment_date' => 'required|date',
        ]);

        $dbRolls = Roll::whereIn('no_roll', $request->rolls)
            ->orWhereIn('no', $request->rolls)
            ->get();

        if ($dbRolls->isEmpty()) {
            return redirect()->back()->withErrors(['error' => 'Invalid rolls selected.']);
        }

        DB::beginTransaction();
        try {
            // Generate shipment number
            $shipmentNumber = 'SHP-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));

            $shipment = Shipment::create([
                'shipment_number' => $shipmentNumber,
                'customers_id' => $request->customers_id,
                'admin_users_id' => Auth::id(),
                'qc_users_id' => $request->qc_users_id,
                'status' => 'pending',
                'shipment_date' => $request->shipment_date,
            ]);

            $affectedLocations = [];
            foreach ($dbRolls as $roll) {
                ShipmentRoll::create([
                    'shipment_id' => $shipment->id,
                    'roll_no' => $roll->no,
                    'qc_status' => 'pending'
                ]);
                if ($roll->locations_id) {
                    $affectedLocations[] = $roll->locations_id;
                }
            }

            // Sync location states to Shipment Plan (status = 3)
            foreach (array_unique($affectedLocations) as $locId) {
                Location::find($locId)?->syncState();
            }

            DB::commit();
            return redirect('/roll-inventory?tab=shipments')->with('success', 'Shipment created successfully. Warehouse slots updated to Shipment Plan.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Failed to create shipment: ' . $e->getMessage()]);
        }
    }

    public function qcScan(Request $request)
    {
        $request->validate([
            'shipment_id' => 'required|exists:shipments,id',
            'no_roll' => 'required|string',
        ]);

        $roll = Roll::where('no_roll', $request->no_roll)
            ->orWhere('no', $request->no_roll)
            ->first();
        if (!$roll) {
            return redirect()->back()->withErrors(['no_roll' => 'Roll not found.']);
        }

        $shipmentRoll = ShipmentRoll::where('shipment_id', $request->shipment_id)
            ->where('roll_no', $roll->no)
            ->first();

        if (!$shipmentRoll) {
            return redirect()->back()->withErrors(['no_roll' => 'Roll does not belong to this shipment.']);
        }

        DB::beginTransaction();
        try {
            $shipmentRoll->update([
                'qc_status' => 'passed',
                'qc_checked_at' => now()
            ]);

            // Release roll from warehouse storage slot upon QC pass
            $oldLocationId = $roll->locations_id;
            if ($oldLocationId) {
                $roll->update(['locations_id' => null]);
                Location::find($oldLocationId)?->syncState();
            }

            $this->updateShipmentStatus($shipmentRoll->shipment_id);

            DB::commit();
            return redirect()->back()->with('success', "Roll {$roll->no_roll} marked as passed and freed from warehouse slot.");
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Failed to update QC status: ' . $e->getMessage()]);
        }
    }

    public function qcReject(Request $request)
    {
        $request->validate([
            'shipment_id' => 'required|exists:shipments,id',
            'roll_no' => 'required|integer',
            'reject_type' => 'required|in:replace,fixed',
            'notes' => 'nullable|string',
        ]);

        $shipmentRoll = ShipmentRoll::where('shipment_id', $request->shipment_id)
            ->where('roll_no', $request->roll_no)
            ->firstOrFail();

        $roll = Roll::where('no', $request->roll_no)->first();

        DB::beginTransaction();
        try {
            if ($request->reject_type === 'replace') {
                $shipmentRoll->update([
                    'qc_status' => 'rejected_replace',
                    'qc_notes' => $request->notes,
                    'qc_checked_at' => now()
                ]);
                // Keep roll in warehouse or sync state
                if ($roll && $roll->locations_id) {
                    Location::find($roll->locations_id)?->syncState();
                }
            } else {
                $shipmentRoll->update([
                    'qc_status' => 'passed',
                    'qc_notes' => 'Fixed: ' . $request->notes,
                    'qc_checked_at' => now()
                ]);
                // Release roll from warehouse storage slot
                if ($roll && $roll->locations_id) {
                    $oldLocId = $roll->locations_id;
                    $roll->update(['locations_id' => null]);
                    Location::find($oldLocId)?->syncState();
                }
            }

            $this->updateShipmentStatus($shipmentRoll->shipment_id);

            DB::commit();
            return redirect()->back()->with('success', 'Roll rejection status updated.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Failed to reject roll: ' . $e->getMessage()]);
        }
    }

    public function cancelRoll($shipmentId, $rollNo)
    {
        $shipmentRoll = ShipmentRoll::where('shipment_id', $shipmentId)
            ->where(function ($q) use ($rollNo) {
                $q->where('roll_no', $rollNo)
                  ->orWhere('id', $rollNo);
            })
            ->first();

        if (!$shipmentRoll) {
            return redirect()->back()->withErrors(['error' => 'Roll not found in this shipment.']);
        }

        $roll = Roll::where('no', $shipmentRoll->roll_no)->first();

        $shipmentRoll->delete();

        if ($roll && $roll->locations_id) {
            Location::find($roll->locations_id)?->syncState();
        }

        $this->updateShipmentStatus($shipmentId);

        return redirect()->back()->with('success', 'Roll removed from shipment successfully.');
    }

    public function cancelShipment($id)
    {
        $shipment = Shipment::with('shipmentRolls')->findOrFail($id);
        
        $rollNos = $shipment->shipmentRolls->pluck('roll_no')->toArray();
        $affectedLocations = Roll::whereIn('no', $rollNos)->whereNotNull('locations_id')->pluck('locations_id')->toArray();

        $shipment->update(['status' => 'canceled']);

        foreach (array_unique($affectedLocations) as $locId) {
            Location::find($locId)?->syncState();
        }

        return redirect()->back()->with('success', "Shipment {$shipment->shipment_number} has been canceled.");
    }

    private function updateShipmentStatus($shipmentId)
    {
        $shipment = Shipment::with('shipmentRolls')->find($shipmentId);
        if (!$shipment || $shipment->status === 'canceled') return;

        $totalRolls = $shipment->shipmentRolls->count();
        if ($totalRolls === 0) {
            $shipment->update(['status' => 'pending']);
            return;
        }

        $checkedRolls = $shipment->shipmentRolls->whereIn('qc_status', ['passed', 'rejected_replace'])->count();

        if ($checkedRolls === 0) {
            $shipment->update(['status' => 'pending']);
        } else {
            $newStatus = ($checkedRolls === $totalRolls) ? 'completed' : 'qc_in_progress';
            if ($shipment->status !== $newStatus) {
                $shipment->update(['status' => $newStatus]);
            }
        }
    }
}
