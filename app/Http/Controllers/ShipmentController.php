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
use Illuminate\Support\Facades\Gate;

class ShipmentController extends Controller
{
    // Redirect to integrated Roll Inventory shipments tab
    public function index()
    {
        return redirect('/roll-inventory?tab=shipments');
    }

    public function history(Request $request)
    {
        $date = $request->input('date', now()->format('Y-m-d'));
        
        $shipments = Shipment::with([
                'customers', 
                'admin', 
                'qc', 
                'shipmentRolls.roll.grade',
                'shipmentRolls.roll.jop.gsm',
                'shipmentRolls.roll.core'
            ])
            ->where('status', 'completed')
            ->whereDate('shipment_date', $date)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($shipment) {
                return [
                    'id' => $shipment->id,
                    'shipment_number' => $shipment->shipment_number,
                    'shipment_date' => $shipment->shipment_date,
                    'status' => $shipment->status,
                    'customer' => ['id' => $shipment->customers->pluck('id')->toArray(), 'customer' => $shipment->customers->pluck('customer')->join(', ') ?: '—'],
                    'admin' => ['id' => $shipment->admin_users_id, 'username' => $shipment->admin->username ?? '—'],
                    'qc' => ['id' => $shipment->qc_users_id, 'username' => $shipment->qc->username ?? '—'],
                    'shipment_rolls' => $shipment->shipmentRolls->map(function ($sr) {
                        return [
                            'id' => $sr->id,
                            'roll_no' => $sr->roll_no,
                            'qc_status' => $sr->qc_status,
                            'qc_notes' => $sr->qc_notes,
                            'qc_checked_at' => $sr->qc_checked_at,
                            'roll' => [
                                'no_roll' => $sr->roll->no_roll ?? ('R-' . $sr->roll_no),
                                'grade' => $sr->roll->grade->grade ?? '—',
                                'gsm' => $sr->roll->jop->gsm->gsm ?? ($sr->roll->gsm ?? 150),
                                'weight' => $sr->roll->weight ?? 0,
                                'width' => 1650, // default if no specific jop width
                                'length' => 0, 
                                'joint' => 0,
                                'type' => $sr->roll->exmaterial ?? 'IMPORT',
                                'core' => $sr->roll->core->core ?? '76',
                            ]
                        ];
                    }),
                ];
            });
            
        $shipmentDates = Shipment::where('status', 'completed')
            ->selectRaw('DATE(shipment_date) as date')
            ->distinct()
            ->pluck('date')
            ->toArray();

        return Inertia::render('ShipmentHistory', [
            'shipments' => $shipments,
            'selectedDate' => $date,
            'shipmentDates' => $shipmentDates
        ]);
    }

    // For Admin to create a new shipment
    public function store(Request $request)
    {
        $request->validate([
            'customers_id' => 'required|array|min:1',
            'customers_id.*' => 'exists:customers,id',
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
                'admin_users_id' => Auth::id(),
                'qc_users_id' => $request->qc_users_id,
                'status' => 'pending',
                'shipment_date' => $request->shipment_date,
            ]);

            $shipment->customers()->sync($request->customers_id);

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
            'qc_issues' => 'nullable|array',
        ]);

        $shipment = Shipment::findOrFail($request->shipment_id);
        Gate::authorize('qcProcess', $shipment);

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
                'qc_issues' => $request->has('qc_issues') ? json_encode($request->qc_issues) : null,
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

    public function submitQcReport(Request $request, $id)
    {
        $request->validate([
            'qc_report_notes' => 'required|array',
        ]);

        $shipment = Shipment::findOrFail($id);
        Gate::authorize('qcProcess', $shipment);

        // Optional: Check if all rolls are scanned
        $unscanned = ShipmentRoll::where('shipment_id', $shipment->id)
            ->where('qc_status', 'pending')
            ->count();
        
        if ($unscanned > 0) {
            return redirect()->back()->withErrors(['error' => 'Cannot submit report. Some rolls are not scanned yet.']);
        }

        $shipment->update([
            'qc_report_notes' => json_encode($request->qc_report_notes),
            // The status might have been set to 'completed' automatically by updateShipmentStatus, but just in case:
            'status' => 'completed'
        ]);

        return redirect()->back()->with('success', 'QC Report submitted successfully.');
    }

    public function qcReject(Request $request)
    {
        $request->validate([
            'shipment_id' => 'required|exists:shipments,id',
            'roll_no' => 'required|integer',
            'reject_type' => 'required|in:replace,fixed',
            'notes' => 'nullable|string',
        ]);

        $shipment = Shipment::findOrFail($request->shipment_id);
        Gate::authorize('qcProcess', $shipment);

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
        $shipment = Shipment::find($shipmentId);
        if (!$shipment) {
            return redirect()->back()->withErrors(['error' => 'Shipment not found.']);
        }

        Gate::authorize('update', $shipment);

        if (in_array($shipment->status, ['completed', 'canceled'])) {
            return redirect()->back()->withErrors(['error' => 'Cannot modify a completed or canceled shipment.']);
        }

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
        Gate::authorize('cancel', $shipment);
        
        if ($shipment->status === 'completed') {
            return redirect()->back()->withErrors(['error' => 'Cannot cancel a completed shipment.']);
        }
        
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
            // Even if all rolls are checked, it remains qc_in_progress until the final QC report is submitted.
            // The final report submission will change it to 'completed'.
            $newStatus = 'qc_in_progress';
            if ($shipment->status !== $newStatus && $shipment->status !== 'completed') {
                $shipment->update(['status' => $newStatus]);
            }
        }
    }

    public function print($id)
    {
        $shipment = Shipment::with([
            'customers',
            'shipmentRolls.roll.grade',
            'shipmentRolls.roll.gsm',
            'shipmentRolls.roll.jop',
            'shipmentRolls.roll.location',
            'shipmentRolls.roll.rollsWidth',
            'shipmentRolls.roll.rollsDiameter'
        ])->findOrFail($id);

        return view('print.weight_list', compact('shipment'));
    }

    public function printQc($id)
    {
        $shipment = Shipment::with(['customers', 'qc'])->findOrFail($id);
        
        return view('print.qc_report', compact('shipment'));
    }
}
