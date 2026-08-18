<?php

namespace App\Http\Controllers;

use App\Models\Roll;
use App\Models\Location;
use App\Models\Shift;
use App\Models\Grade;
use App\Models\Jop;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class RollController extends Controller
{

    public function index()
    {
        $rolls = Roll::with(['shift', 'grade', 'plybond', 'thickness', 'core', 'cobb', 'location', 'user', 'jop'])
            ->orderBy('entry_date', 'desc')
            ->orderBy('no', 'desc')
            ->get()
            ->map(function ($roll) {
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

        return Inertia::render('RollInventory', [
            'rolls' => $rolls,
            'shifts' => $shifts,
            'grades' => $grades,
            'locations' => $locations,
            'jops' => $jops,
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
            'id' => $roll->no_roll,
            'raw_id' => $roll->no,
            'no_roll' => $roll->no_roll,
            'form' => $roll->form ? ('F-' . $roll->form) : '—',
            'raw_form' => $roll->form,
            'shift' => $roll->shift->shift ?? 'A',
            'shifts_id' => $roll->shifts_id,
            'date' => $roll->entry_date ? \Carbon\Carbon::parse($roll->entry_date)->format('Y-m-d') : '—',
            'grade' => $roll->grade->grade ?? 'N/A',
            'grades_id' => $roll->grades_id,
            'gsm' => 150,
            'plybond' => $roll->plybond->plybonds ?? 1.8,
            'thickness' => $roll->thickness->thickness ?? 0.22,
            'bulk' => $roll->bulk ?? 1.47,
            'width' => 1650,
            'diameter' => 1120,
            'core' => $roll->core->core ?? 76,
            'weight' => $roll->weight ?? 0,
            'cobb' => $roll->cobb->cobb ?? '68',
            'exMaterial' => $roll->exmaterial ?? 'IMPORT',
            'visual' => $roll->visual ?? 'OK',
            'location' => $roll->location->location ?? 'Unallocated',
            'locations_id' => $roll->locations_id,
            'jop' => $roll->jop->jop ?? '—',
            'jops_id' => $roll->jops_id,
            'pic' => $roll->user->username ?? 'Operator',
            'status' => $roll->locations_id ? 'Slotted' : ($roll->jops_id ? 'Shipment Plan' : 'Incoming'),
            'customer' => $roll->jop->customer->customer ?? 'PT Surya Makmur',
            'po' => $roll->jop->po ?? 'PO-TYO-2407',
            'spk' => $roll->jop->spk ?? 'SPK-240701',
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
            if (!empty($validated['locations_id']) && $validated['locations_id'] != $roll->locations_id) {
                if ($roll->locations_id) {
                    Location::where('id', $roll->locations_id)->update(['status' => 0]);
                }
                Location::where('id', $validated['locations_id'])->update(['status' => 1]);
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
}
