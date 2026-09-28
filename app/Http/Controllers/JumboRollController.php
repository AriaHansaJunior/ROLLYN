<?php

namespace App\Http\Controllers;

use App\Models\JumboRoll;
use App\Models\Jop;
use App\Models\Roll;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class JumboRollController extends Controller
{
    /**
     * Display a listing of Jumbo Rolls.
     */
    public function index(Request $request)
    {
        $search = trim($request->input('search', ''));
        $status = trim($request->input('status', ''));
        $dateFrom = trim($request->input('date_from', ''));
        $dateTo = trim($request->input('date_to', ''));

        $query = JumboRoll::with([
            'jop.customer',
            'jop.grade',
            'jop.gsm',
            'jop.rollsWidth',
            'user',
            'rolls.grade',
            'rolls.gsm',
            'rolls.shift',
            'rolls.location',
            'rolls.rollsWidth',
        ]);

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('jumbo_roll_number', 'like', "%{$search}%")
                    ->orWhereHas('jop', function ($jq) use ($search) {
                        $jq->where('jop', 'like', "%{$search}%")
                            ->orWhere('spk', 'like', "%{$search}%")
                            ->orWhere('po', 'like', "%{$search}%")
                            ->orWhereHas('customer', function ($cq) use ($search) {
                                $cq->where('customer', 'like', "%{$search}%");
                            });
                    });
            });
        }

        if ($status !== '' && $status !== 'ALL') {
            $query->where('status', $status);
        }

        if ($dateFrom !== '') {
            $query->whereDate('production_date', '>=', $dateFrom);
        }

        if ($dateTo !== '') {
            $query->whereDate('production_date', '<=', $dateTo);
        }

        $jumboRolls = $query->orderBy('production_date', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        // Calculate summary statistics
        $allJumboRolls = JumboRoll::with('rolls')->get();
        $totalJumboRolls = $allJumboRolls->count();
        $totalJumboWeight = (float) $allJumboRolls->sum('weight');
        $totalCutRolls = $allJumboRolls->sum('rolls_count');
        $totalCutWeight = (float) $allJumboRolls->sum('total_cut_weight');
        $averageYield = $totalJumboWeight > 0
            ? round(($totalCutWeight / $totalJumboWeight) * 100, 2)
            : 0;

        // JOP list for creating/editing jumbo rolls
        $jopList = Jop::with(['customer', 'grade', 'gsm', 'rollsWidth'])
            ->latest('id')
            ->get()
            ->map(function ($jop) {
                return [
                    'id' => $jop->id,
                    'jop' => $jop->jop,
                    'spk' => $jop->spk,
                    'po' => $jop->po,
                    'customer' => $jop->customer?->customer ?? '—',
                    'grade' => $jop->grade?->grade ?? '—',
                    'gsm' => $jop->gsm?->gsm ?? null,
                    'width' => $jop->rollsWidth?->width ?? null,
                    'weight' => $jop->weight,
                    'quantity' => $jop->quantity,
                ];
            });

        // Format jumbo rolls for frontend
        $formattedJumboRolls = $jumboRolls->map(function ($jr) {
            return [
                'id' => $jr->id,
                'jumbo_roll_number' => $jr->jumbo_roll_number,
                'jops_id' => $jr->jops_id,
                'weight' => (float) $jr->weight,
                'production_date' => $jr->production_date ? $jr->production_date->format('Y-m-d') : null,
                'status' => $jr->status ?? 'IN_PROGRESS',
                'notes' => $jr->notes,
                'created_at' => $jr->created_at ? $jr->created_at->format('Y-m-d H:i') : null,
                'user' => $jr->user?->username ?? 'Operator',
                'jop' => [
                    'id' => $jr->jop?->id,
                    'jop' => $jr->jop?->jop ?? '—',
                    'spk' => $jr->jop?->spk ?? '—',
                    'po' => $jr->jop?->po ?? '—',
                    'customer' => $jr->jop?->customer?->customer ?? '—',
                    'grade' => $jr->jop?->grade?->grade ?? '—',
                    'gsm' => $jr->jop?->gsm?->gsm ?? null,
                    'width' => $jr->jop?->rollsWidth?->width ?? null,
                    'target_weight' => $jr->jop?->weight,
                ],
                'rolls_count' => $jr->rolls_count,
                'total_cut_weight' => $jr->total_cut_weight,
                'remaining_weight' => $jr->remaining_weight,
                'yield_percentage' => $jr->yield_percentage,
                'rolls' => $jr->rolls->map(function ($r) {
                    return [
                        'no' => $r->no,
                        'no_roll' => $r->no_roll,
                        'form' => $r->form,
                        'weight' => (float) $r->weight,
                        'grade' => $r->grade?->grade ?? '—',
                        'gsm' => $r->gsm?->gsm ?? '—',
                        'shift' => $r->shift?->shift ?? '—',
                        'width' => $r->rollsWidth?->width ?? null,
                        'status' => $r->status ?? 'OK',
                        'location' => $r->location?->location ?? 'Unallocated',
                        'entry_date' => $r->entry_date ? \Carbon\Carbon::parse($r->entry_date)->format('Y-m-d') : '—',
                    ];
                }),
            ];
        });

        if ($request->wantsJson()) {
            return response()->json([
                'jumboRolls' => $formattedJumboRolls,
                'summary' => [
                    'totalJumboRolls' => $totalJumboRolls,
                    'totalJumboWeight' => $totalJumboWeight,
                    'totalCutRolls' => $totalCutRolls,
                    'totalCutWeight' => $totalCutWeight,
                    'averageYield' => $averageYield,
                ],
            ]);
        }

        return Inertia::render('JumboRoll', [
            'jumboRolls' => $formattedJumboRolls,
            'jopList' => $jopList,
            'summary' => [
                'totalJumboRolls' => $totalJumboRolls,
                'totalJumboWeight' => $totalJumboWeight,
                'totalCutRolls' => $totalCutRolls,
                'totalCutWeight' => $totalCutWeight,
                'averageYield' => $averageYield,
            ],
            'filters' => [
                'search' => $search,
                'status' => $status,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
        ]);
    }

    /**
     * Show details for a single Jumbo Roll with its associated Incoming Rolls.
     */
    public function show($id)
    {
        $jumboRoll = JumboRoll::with([
            'jop.customer',
            'jop.grade',
            'jop.gsm',
            'jop.rollsWidth',
            'user',
            'rolls.grade',
            'rolls.gsm',
            'rolls.shift',
            'rolls.location',
            'rolls.rollsWidth',
            'rolls.rollsDiameter',
            'rolls.core',
            'rolls.user',
        ])->findOrFail($id);

        $formatted = [
            'id' => $jumboRoll->id,
            'jumbo_roll_number' => $jumboRoll->jumbo_roll_number,
            'jops_id' => $jumboRoll->jops_id,
            'weight' => (float) $jumboRoll->weight,
            'production_date' => $jumboRoll->production_date ? $jumboRoll->production_date->format('Y-m-d') : null,
            'status' => $jumboRoll->status ?? 'IN_PROGRESS',
            'notes' => $jumboRoll->notes,
            'created_at' => $jumboRoll->created_at ? $jumboRoll->created_at->format('Y-m-d H:i') : null,
            'user' => $jumboRoll->user?->username ?? 'Operator',
            'jop' => [
                'id' => $jumboRoll->jop?->id,
                'jop' => $jumboRoll->jop?->jop ?? '—',
                'spk' => $jumboRoll->jop?->spk ?? '—',
                'po' => $jumboRoll->jop?->po ?? '—',
                'customer' => $jumboRoll->jop?->customer?->customer ?? '—',
                'grade' => $jumboRoll->jop?->grade?->grade ?? '—',
                'gsm' => $jumboRoll->jop?->gsm?->gsm ?? null,
                'width' => $jumboRoll->jop?->rollsWidth?->width ?? null,
                'target_weight' => $jumboRoll->jop?->weight,
            ],
            'rolls_count' => $jumboRoll->rolls_count,
            'total_cut_weight' => $jumboRoll->total_cut_weight,
            'remaining_weight' => $jumboRoll->remaining_weight,
            'yield_percentage' => $jumboRoll->yield_percentage,
            'rolls' => $jumboRoll->rolls->map(function ($r) {
                return [
                    'no' => $r->no,
                    'no_roll' => $r->no_roll,
                    'form' => $r->form ? ('F-' . $r->form) : '—',
                    'weight' => (float) $r->weight,
                    'grade' => $r->grade?->grade ?? '—',
                    'gsm' => $r->gsm?->gsm ?? '—',
                    'shift' => $r->shift?->shift ?? '—',
                    'width' => $r->rollsWidth?->width ?? 1650,
                    'diameter' => $r->rollsDiameter?->diameter ?? 1120,
                    'core' => $r->core?->core ?? '3',
                    'status' => $r->status ?? 'OK',
                    'location' => $r->location?->location ?? 'Unallocated',
                    'entry_date' => $r->entry_date ? \Carbon\Carbon::parse($r->entry_date)->format('Y-m-d') : '—',
                    'pic' => $r->user?->username ?? 'Operator',
                ];
            }),
        ];

        return response()->json($formatted);
    }

    /**
     * Store a new Jumbo Roll.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'jumbo_roll_number' => 'required|string|max:50|unique:jumbo_rolls,jumbo_roll_number',
            'jops_id'           => 'required|exists:jops,id',
            'weight'            => 'required|numeric|min:1|max:100000',
            'production_date'   => 'required|date',
            'status'            => 'nullable|string|in:IN_PROGRESS,COMPLETED,HOLD',
            'notes'             => 'nullable|string|max:1000',
        ]);

        $userId = Auth::id();
        if (!$userId) {
            $firstUser = \App\Models\User::first();
            $userId = $firstUser ? $firstUser->id : null;
        }

        $jumboRoll = JumboRoll::create([
            'jumbo_roll_number' => trim($validated['jumbo_roll_number']),
            'jops_id'           => $validated['jops_id'],
            'weight'            => $validated['weight'],
            'production_date'   => $validated['production_date'],
            'status'            => $validated['status'] ?? 'IN_PROGRESS',
            'notes'             => $validated['notes'] ?? null,
            'users_id'          => $userId,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => "Jumbo Roll '{$jumboRoll->jumbo_roll_number}' created successfully.",
            'data'    => $jumboRoll,
        ], 201);
    }

    /**
     * Update an existing Jumbo Roll.
     */
    public function update(Request $request, $id)
    {
        $jumboRoll = JumboRoll::findOrFail($id);

        $validated = $request->validate([
            'jumbo_roll_number' => "required|string|max:50|unique:jumbo_rolls,jumbo_roll_number,{$id}",
            'jops_id'           => 'required|exists:jops,id',
            'weight'            => 'required|numeric|min:1|max:100000',
            'production_date'   => 'required|date',
            'status'            => 'nullable|string|in:IN_PROGRESS,COMPLETED,HOLD',
            'notes'             => 'nullable|string|max:1000',
        ]);

        $jumboRoll->update([
            'jumbo_roll_number' => trim($validated['jumbo_roll_number']),
            'jops_id'           => $validated['jops_id'],
            'weight'            => $validated['weight'],
            'production_date'   => $validated['production_date'],
            'status'            => $validated['status'] ?? 'IN_PROGRESS',
            'notes'             => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => "Jumbo Roll '{$jumboRoll->jumbo_roll_number}' updated successfully.",
            'data'    => $jumboRoll,
        ]);
    }

    /**
     * Safely delete a Jumbo Roll.
     * Prevents deletion if associated Incoming Rolls exist to ensure referential integrity.
     */
    public function destroy($id)
    {
        $jumboRoll = JumboRoll::withCount('rolls')->findOrFail($id);

        // Delete Safety: Check if associated Incoming Rolls exist
        if ($jumboRoll->rolls_count > 0) {
            return response()->json([
                'status'  => 'error',
                'message' => "Cannot delete Jumbo Roll '{$jumboRoll->jumbo_roll_number}' because it has {$jumboRoll->rolls_count} associated Incoming Roll(s). Please unassign or remove the associated rolls first to maintain data integrity.",
            ], 422);
        }

        $rollNumber = $jumboRoll->jumbo_roll_number;
        $jumboRoll->delete();

        return response()->json([
            'status'  => 'success',
            'message' => "Jumbo Roll '{$rollNumber}' deleted successfully.",
        ]);
    }

    /**
     * Assign / Link existing Incoming Rolls to this Jumbo Roll.
     */
    public function assignRolls(Request $request, $id)
    {
        $jumboRoll = JumboRoll::findOrFail($id);

        $validated = $request->validate([
            'roll_ids'   => 'required|array|min:1',
            'roll_ids.*' => 'required|exists:rolls,no',
        ]);

        $updatedCount = Roll::whereIn('no', $validated['roll_ids'])
            ->update(['jumbo_roll_id' => $jumboRoll->id]);

        return response()->json([
            'status'  => 'success',
            'message' => "{$updatedCount} Incoming Roll(s) successfully linked to Jumbo Roll '{$jumboRoll->jumbo_roll_number}'.",
        ]);
    }

    /**
     * Remove / Unlink an Incoming Roll from this Jumbo Roll.
     */
    public function removeRoll($id, $rollNo)
    {
        $jumboRoll = JumboRoll::findOrFail($id);

        $roll = Roll::where('jumbo_roll_id', $jumboRoll->id)
            ->where(function ($q) use ($rollNo) {
                $q->where('no', $rollNo)->orWhere('no_roll', $rollNo);
            })->firstOrFail();

        $rollNumber = $roll->no_roll;
        $roll->update(['jumbo_roll_id' => null]);

        return response()->json([
            'status'  => 'success',
            'message' => "Incoming Roll '{$rollNumber}' has been unlinked from Jumbo Roll '{$jumboRoll->jumbo_roll_number}'.",
        ]);
    }

    /**
     * Get candidate Incoming Rolls that can be linked to this Jumbo Roll.
     */
    public function getAvailableRolls(Request $request, $id)
    {
        $jumboRoll = JumboRoll::findOrFail($id);
        $search = trim($request->input('search', ''));

        $query = Roll::whereNull('jumbo_roll_id')
            ->with(['grade', 'gsm', 'shift', 'location', 'rollsWidth']);

        // By default, prioritize rolls with matching JOP, but allow all unassigned
        if ($request->boolean('same_jop_only', false)) {
            $query->where('jops_id', $jumboRoll->jops_id);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('no_roll', 'like', "%{$search}%")
                    ->orWhere('form', 'like', "%{$search}%");
            });
        }

        $availableRolls = $query->orderBy('no', 'desc')
            ->limit(50)
            ->get()
            ->map(function ($r) {
                return [
                    'no' => $r->no,
                    'no_roll' => $r->no_roll,
                    'form' => $r->form,
                    'weight' => (float) $r->weight,
                    'grade' => $r->grade?->grade ?? '—',
                    'gsm' => $r->gsm?->gsm ?? '—',
                    'shift' => $r->shift?->shift ?? '—',
                    'width' => $r->rollsWidth?->width ?? null,
                    'status' => $r->status ?? 'OK',
                    'location' => $r->location?->location ?? 'Unallocated',
                    'entry_date' => $r->entry_date ? \Carbon\Carbon::parse($r->entry_date)->format('Y-m-d') : '—',
                ];
            });

        return response()->json($availableRolls);
    }
}
