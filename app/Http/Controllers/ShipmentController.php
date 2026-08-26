<?php

namespace App\Http\Controllers;

use App\Models\Shipment;
use App\Models\ShipmentRoll;
use App\Models\Roll;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class ShipmentController extends Controller
{
    // For QC Officers to view their assigned shipments
    public function index()
    {
        $user = Auth::user();
        $shipments = Shipment::with(['customer', 'admin', 'shipmentRolls.roll.grade', 'shipmentRolls.roll.jop.gsm'])
            ->where('qc_users_id', $user->id)
            ->latest('shipment_date')
            ->get()
            ->map(function ($shipment) {
                return [
                    'id' => $shipment->id,
                    'shipment_number' => $shipment->shipment_number,
                    'customer' => $shipment->customer->customer ?? '—',
                    'date' => $shipment->shipment_date,
                    'status' => $shipment->status,
                    'total_rolls' => $shipment->shipmentRolls->count(),
                    'checked_rolls' => $shipment->shipmentRolls->whereIn('qc_status', ['passed', 'rejected_replace'])->count(),
                    'rolls' => $shipment->shipmentRolls->map(function ($sr) {
                        return [
                            'id' => $sr->id,
                            'roll_no' => $sr->roll_no,
                            'no_roll' => $sr->roll->no_roll ?? ('R-' . $sr->roll_no),
                            'grade' => $sr->roll->grade->grade ?? '—',
                            'gsm' => $sr->roll->jop->gsm->gsm ?? '—',
                            'qc_status' => $sr->qc_status,
                            'qc_notes' => $sr->qc_notes,
                            'qc_checked_at' => $sr->qc_checked_at,
                        ];
                    }),
                ];
            });

        return Inertia::render('Shipments', [
            'shipments' => $shipments
        ]);
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

            foreach ($dbRolls as $roll) {
                ShipmentRoll::create([
                    'shipment_id' => $shipment->id,
                    'roll_no' => $roll->no,
                    'qc_status' => 'pending'
                ]);
            }

            DB::commit();
            return redirect()->back()->with('success', 'Shipment created successfully.');
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

        $roll = Roll::where('no_roll', $request->no_roll)->first();
        if (!$roll) {
            return redirect()->back()->withErrors(['no_roll' => 'Roll not found.']);
        }

        $shipmentRoll = ShipmentRoll::where('shipment_id', $request->shipment_id)
            ->where('roll_no', $roll->no)
            ->first();

        if (!$shipmentRoll) {
            return redirect()->back()->withErrors(['no_roll' => 'Roll does not belong to this shipment.']);
        }

        $shipmentRoll->update([
            'qc_status' => 'passed',
            'qc_checked_at' => now()
        ]);
        
        $this->updateShipmentStatus($shipmentRoll->shipment_id);

        return redirect()->back()->with('success', 'Roll marked as passed.');
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

        if ($request->reject_type === 'replace') {
            $shipmentRoll->update([
                'qc_status' => 'rejected_replace',
                'qc_notes' => $request->notes,
                'qc_checked_at' => now()
            ]);
            // Logic to handle JOP creation could go here or emit an event
        } else {
            $shipmentRoll->update([
                'qc_status' => 'passed',
                'qc_notes' => 'Fixed: ' . $request->notes,
                'qc_checked_at' => now()
            ]);
        }
        
        $this->updateShipmentStatus($shipmentRoll->shipment_id);

        return redirect()->back()->with('success', 'Roll rejection status updated.');
    }

    private function updateShipmentStatus($shipmentId)
    {
        $shipment = Shipment::with('shipmentRolls')->find($shipmentId);
        $totalRolls = $shipment->shipmentRolls->count();
        $checkedRolls = $shipment->shipmentRolls->whereIn('qc_status', ['passed', 'rejected_replace'])->count();

        if ($checkedRolls > 0) {
            $newStatus = ($checkedRolls === $totalRolls) ? 'completed' : 'qc_in_progress';
            if ($shipment->status !== $newStatus) {
                $shipment->update(['status' => $newStatus]);
            }
        }
    }
}
