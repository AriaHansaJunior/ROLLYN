<?php

namespace App\Http\Controllers;

use App\Models\Roll;
use App\Models\Location;
use App\Models\Shift;
use App\Models\Grade;
use App\Models\Jop;
use App\Models\LocationRecommendationLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class RollController extends Controller
{

    public function index()
    {
        $rolls = Roll::with(['shift', 'grade', 'plybond', 'thickness', 'core', 'cobb', 'location', 'user', 'jop', 'shipmentRolls.shipment'])
            ->orderBy('entry_date', 'desc')
            ->orderBy('no', 'desc')
            ->get()
            ->map(function ($roll) {
                $activeShipmentRoll = $roll->shipmentRolls->first(function ($sr) {
                    return $sr->shipment && $sr->shipment->status !== 'canceled';
                });

                return [
                    'id' => $roll->no_roll ?? ('R-' . $roll->no),
                    'raw_id' => $roll->no,
                    'no_roll' => $roll->no_roll,
                    'form' => $roll->form ? ('F-' . $roll->form) : '—',
                    'raw_form' => $roll->form,
                    'shift' => $roll->shift->shift ?? 'A',
                    'shifts_id' => $roll->shifts_id,
                    'date' => $roll->entry_date ? \Carbon\Carbon::parse($roll->entry_date)->format('Y-m-d') : '—',
                    'grade' => $roll->grade->grade ?? 'N/A',
                    'grades_id' => $roll->grades_id,
                    'gsm' => $roll->gsm ?? 150,
                    'weight' => $roll->weight ?? 0,
                    'width' => 1650,
                    'location' => $roll->location->location ?? '',
                    'locations_id' => $roll->locations_id,
                    'jop' => $roll->jop->jop ?? '—',
                    'jops_id' => $roll->jops_id,
                    'pic' => $roll->user->username ?? 'Operator',
                    'status' => $roll->locations_id ? 'Slotted' : ($roll->jops_id ? 'Shipment Plan' : 'Incoming'),
                    'in_shipment_queue' => !is_null($activeShipmentRoll),
                    'shipment_queue_number' => $activeShipmentRoll?->shipment?->shipment_number,
                    'shipment_queue_status' => $activeShipmentRoll?->shipment?->status,
                    'shipment_queue_qc_status' => $activeShipmentRoll?->qc_status,
                    'exMaterial' => $roll->exmaterial ?? 'IMPORT',
                    'visual' => $roll->visual ?? 'OK',
                    'plybond' => $roll->plybond->plybonds ?? 0,
                    'thickness' => $roll->thickness->thickness ?? 0,
                    'bulk' => $roll->bulk ?? 0,
                    'diameter' => 1200,
                    'core' => $roll->core->core ?? '3',
                    'cobb' => $roll->cobb->cobb ?? '',
                ];
            });

        $shifts = Shift::all();
        $grades = Grade::all();
        $locations = Location::all();
        $jops = Jop::all();
        $customers = \App\Models\Customer::all();
        $qcUsers = \App\Models\User::where('role', 'qc')->get();

        $user = Auth::user();
        $userRole = strtolower($user->role ?? '');

        $shipmentsQuery = \App\Models\Shipment::with([
            'customer',
            'admin',
            'qc',
            'shipmentRolls.roll.grade',
            'shipmentRolls.roll.jop.gsm'
        ])->latest('shipment_date')->latest('id');

        if ($userRole === 'qc') {
            $shipmentsQuery->where('qc_users_id', $user->id);
        }

        $shipments = $shipmentsQuery->get()->map(function ($shipment) {
            return [
                'id' => $shipment->id,
                'shipment_number' => $shipment->shipment_number,
                'customer' => $shipment->customer->customer ?? '—',
                'admin' => $shipment->admin->username ?? '—',
                'qc_officer' => $shipment->qc->username ?? '—',
                'qc_users_id' => $shipment->qc_users_id,
                'date' => $shipment->shipment_date,
                'status' => $shipment->status,
                'total_rolls' => $shipment->shipmentRolls->count(),
                'checked_rolls' => $shipment->shipmentRolls->whereIn('qc_status', ['passed', 'rejected_replace'])->count(),
                'passed_rolls' => $shipment->shipmentRolls->where('qc_status', 'passed')->count(),
                'rejected_rolls' => $shipment->shipmentRolls->where('qc_status', 'rejected_replace')->count(),
                'rolls' => $shipment->shipmentRolls->map(function ($sr) {
                    return [
                        'id' => $sr->id,
                        'roll_no' => $sr->roll_no,
                        'no_roll' => $sr->roll->no_roll ?? ('R-' . $sr->roll_no),
                        'grade' => $sr->roll->grade->grade ?? '—',
                        'gsm' => $sr->roll->jop->gsm->gsm ?? ($sr->roll->gsm ?? 0),
                        'weight' => $sr->roll->weight ?? 0,
                        'location' => $sr->roll->location->location ?? '—',
                        'qc_status' => $sr->qc_status,
                        'qc_notes' => $sr->qc_notes,
                        'qc_checked_at' => $sr->qc_checked_at ? \Carbon\Carbon::parse($sr->qc_checked_at)->format('d/m/Y H:i') : null,
                    ];
                }),
            ];
        });

        return Inertia::render('RollInventory', [
            'rolls' => $rolls,
            'shifts' => $shifts,
            'grades' => $grades,
            'locations' => $locations,
            'jops' => $jops,
            'customers' => $customers,
            'qcUsers' => $qcUsers,
            'shipments' => $shipments,
        ]);
    }

    public function show($id)
    {
        $roll = Roll::with(['shift', 'grade', 'plybond', 'thickness', 'core', 'cobb', 'location', 'user', 'jop'])
            ->where('no', $id)
            ->orWhere('no_roll', $id)
            ->first();

        if (!$roll) {
            return redirect('/roll-inventory')->with('error', 'Roll record not found.');
        }

        $formattedRoll = [
            'id' => $roll->no_roll ?? ('R-' . $roll->no),
            'raw_id' => $roll->no,
            'no_roll' => $roll->no_roll ?? ('R-' . $roll->no),
            'form' => $roll->form ? ('F-' . $roll->form) : '—',
            'raw_form' => $roll->form,
            'shift' => $roll->shift?->shift ?? 'A',
            'shifts_id' => $roll->shifts_id,
            'date' => $roll->entry_date ? \Carbon\Carbon::parse($roll->entry_date)->format('Y-m-d') : '—',
            'grade' => $roll->grade?->grade ?? 'N/A',
            'grades_id' => $roll->grades_id,
            'gsm' => $roll->gsm ?? 150,
            'plybond' => $roll->plybond?->plybonds ?? 1.8,
            'thickness' => $roll->thickness?->thickness ?? 0.22,
            'bulk' => $roll->bulk ?? 1.47,
            'width' => 1650,
            'diameter' => 1120,
            'core' => $roll->core?->core ?? 76,
            'weight' => $roll->weight ?? 0,
            'cobb' => $roll->cobb?->cobb ?? '68',
            'exMaterial' => $roll->exmaterial ?? 'IMPORT',
            'visual' => $roll->visual ?? 'OK',
            'location' => $roll->location?->location ?? 'Unallocated',
            'locations_id' => $roll->locations_id,
            'jop' => $roll->jop?->jop ?? '—',
            'jops_id' => $roll->jops_id,
            'pic' => $roll->user?->username ?? 'Operator',
            'status' => $roll->locations_id ? 'Slotted' : ($roll->jops_id ? 'Shipment Plan' : 'Incoming'),
            'customer' => $roll->jop?->customer?->customer ?? '—',
            'po' => $roll->jop?->po ?? '—',
            'spk' => $roll->jop?->spk ?? '—',
            'orderStatus' => 'Ready to Ship',
            'ocrTimestamp' => $roll->created_at ? $roll->created_at->format('Y-m-d H:i:s') : '—',
            'ocrWeight' => $roll->weight ?? 0,
            'ocrConfidence' => '98.4%',
            'ocrStatus' => 'Success',
        ];

        return Inertia::render('RollDetail', [
            'roll' => $formattedRoll,
            'shifts' => Shift::all(),
            'grades' => Grade::all(),
            'locations' => Location::all(),
            'jops' => Jop::all(),
        ]);
    }

    public function update(Request $request, $id)
    {
        $roll = Roll::where('no', $id)->orWhere('no_roll', $id)->first();

        if (!$roll) {
            return redirect()->back()->with('error', 'Roll record not found.');
        }

        // Fill missing required attributes from existing roll record
        $request->merge([
            'no_roll' => $request->input('no_roll', $roll->no_roll),
            'shifts_id' => $request->input('shifts_id', $roll->shifts_id),
            'entry_date' => $request->input('entry_date', $roll->entry_date ? \Carbon\Carbon::parse($roll->entry_date)->format('Y-m-d') : now()->toDateString()),
            'grades_id' => $request->input('grades_id', $roll->grades_id),
        ]);

        $validated = $request->validate([
            'no_roll' => 'required|string|max:45|unique:rolls,no_roll,' . $roll->no . ',no',
            'form' => 'nullable|integer',
            'shifts_id' => 'required|exists:shifts,id',
            'entry_date' => 'required|date',
            'grades_id' => 'required|exists:grades,id',
            'weight' => 'nullable|integer',
            'locations_id' => 'nullable|exists:locations,id',
            'jops_id' => 'nullable|exists:jops,id',
            'exmaterial' => 'nullable|in:IMPORT,LOCAL',
            'visual' => 'nullable|string',
        ]);

        DB::beginTransaction(); // ensure atomic slot reallocation
        try {

            // free old slot and lock new slot to prevent race condition
            if (array_key_exists('locations_id', $validated) && $validated['locations_id'] != $roll->locations_id) {
                $oldLocationId = $roll->locations_id;
                $newLocationId = $validated['locations_id'];

                if ($oldLocationId) {
                    Location::where('id', $oldLocationId)->update(['status' => 0]);
                }
                if ($newLocationId) {
                    Location::where('id', $newLocationId)->update(['status' => 1]);
                }

                // Log evaluation for recommendation system if assigning or moving location
                if ($newLocationId) {
                    $recommendedLocationId = $request->input('recommended_locations_id');
                    $actionTypeInput = $request->input('action_type');
                    $actionType = in_array(strtoupper($actionTypeInput ?? ''), ['ASSIGN', 'MOVE'])
                        ? strtoupper($actionTypeInput)
                        : ($oldLocationId ? 'MOVE' : 'ASSIGN');

                    $isMatch = ($recommendedLocationId && (int)$newLocationId === (int)$recommendedLocationId) ? 1 : 0;
                    $userId = Auth::id() ?? ($roll->users_id ?? null);

                    LocationRecommendationLog::create([
                        'rolls_no' => $roll->no,
                        'no_roll' => $validated['no_roll'] ?? $roll->no_roll,
                        'users_id' => $userId,
                        'action_type' => $actionType,
                        'previous_locations_id' => $oldLocationId,
                        'recommended_locations_id' => $recommendedLocationId ? (int)$recommendedLocationId : null,
                        'selected_locations_id' => (int)$newLocationId,
                        'is_match' => $isMatch,
                        'notes' => $request->input('notes'),
                    ]);
                }
            }

            $roll->update($validated);

            DB::commit();

            return redirect()->back()->with('success', 'Roll updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Failed to update roll: ' . $e->getMessage());
        }
    }

    public function destroy($id)
    {
        $roll = Roll::where('no', $id)->orWhere('no_roll', $id)->first();

        if (!$roll) {
            return redirect()->back()->with('error', 'Roll record not found.');
        }

        DB::beginTransaction(); // prevent orphan slotted locations on deletion failure
        try {

            // release physical warehouse map slot
            if ($roll->locations_id) {
                Location::where('id', $roll->locations_id)->update(['status' => 0]);
            }

            $roll->delete();

            DB::commit();

            return redirect('/roll-inventory')->with('success', 'Roll deleted successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Failed to delete roll: ' . $e->getMessage());
        }
    }

    public function confirmShipments(Request $request)
    {
        $request->validate([
            'roll_ids' => 'required|array',
            'roll_ids.*' => 'required|string'
        ]);

        $rolls = Roll::whereIn('no_roll', $request->roll_ids)
                    ->orWhereIn('no', $request->roll_ids)
                    ->get();

        if ($rolls->isEmpty()) {
            return redirect()->back()->with('error', 'No valid rolls found for shipment.');
        }

        DB::beginTransaction();
        try {
            $totalWeight = 0;
            $count = 0;

            foreach ($rolls as $roll) {
                if ($roll->locations_id) {
                    Location::where('id', $roll->locations_id)->update(['status' => 0]);
                }
                $totalWeight += ($roll->weight ?? 0);
                $count++;
                $roll->delete(); // For this system, shipped rolls are removed from active inventory
            }

            \App\Models\SystemNotification::create([
                'type' => 'shipment',
                'title' => 'Outgoing Shipment',
                'message' => "Successfully shipped {$count} rolls totaling " . number_format($totalWeight, 0) . " kg.",
                'is_unread' => true,
            ]);

            DB::commit();
            return redirect()->back()->with('success', 'Shipment confirmed successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Failed to confirm shipments: ' . $e->getMessage());
        }
    }
}
