<?php

namespace App\Http\Controllers;

use App\Models\Jop;
use App\Models\ProductionSchedule;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProductionScheduleController extends Controller
{
    public function index()
    {
        $schedules = ProductionSchedule::with([
            'jop.customer',
            'jop.grade',
            'jop.gsm',
            'jop.rollsWidth',
        ])->latest()->get()->map(function ($s) {
            $j = $s->jop;
            return [
                'id'               => $s->id,
                'jops_id'          => $s->jops_id,
                'spk'              => $j?->spk,
                'jop'              => $j?->jop,
                'po'               => $j?->po,
                'customer'         => $j?->customer?->customer,
                'grade'            => $j?->grade?->grade,
                'gsm'              => $j?->gsm?->gsm,
                'nase'             => $j?->rollsWidth?->width, // NASE = roll width from rollsWidth
                'tonnage'          => $s->tonnage,
                'rewinder_cut'     => $s->rewinder_cut,
                'tph'              => $s->tph,
                'production_hours' => $s->production_hours,
                'start_time'       => $s->start_time?->format('Y-m-d H:i'),
                'stop_time'        => $s->stop_time?->format('Y-m-d H:i'),
                'remark'           => $s->remark,
                'status'           => $s->status,
            ];
        });

        $jops = Jop::with(['customer', 'grade', 'gsm', 'rollsWidth'])
            ->orderBy('jop', 'asc')
            ->get()
            ->map(fn($j) => [
                'id'       => $j->id,
                'spk'      => $j->spk,
                'jop'      => $j->jop,
                'po'       => $j->po,
                'customer' => $j->customer?->customer,
                'grade'    => $j->grade?->grade,
                'gsm'      => $j->gsm?->gsm,
                'nase'     => $j->rollsWidth?->width,
            ]);

        $totalTonnage = $schedules->sum('tonnage');

        return Inertia::render('ProductionSchedule', [
            'schedules'    => $schedules,
            'jops'         => $jops,
            'totalTonnage' => $totalTonnage,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'jops_id'      => 'required|exists:jops,id',
            'tonnage'      => 'required|numeric|min:0.01',
            'rewinder_cut' => 'nullable|string|max:255',
            'tph'          => 'required|numeric|gt:0',
            'start_time'   => 'required|date',
            'remark'       => 'nullable|string',
        ]);

        $productionHours = (int) ceil($validated['tonnage'] / $validated['tph']);
        $startTime       = Carbon::parse($validated['start_time']);
        $stopTime        = $startTime->copy()->addHours($productionHours);

        $schedule = ProductionSchedule::create([
            'jops_id'          => $validated['jops_id'],
            'tonnage'          => $validated['tonnage'],
            'rewinder_cut'     => $validated['rewinder_cut'] ?? null,
            'tph'              => $validated['tph'],
            'production_hours' => $productionHours,
            'start_time'       => $startTime,
            'stop_time'        => $stopTime,
            'remark'           => $validated['remark'] ?? null,
            'status'           => 'OPEN',
        ]);

        return response()->json([
            'message' => 'Production schedule created successfully.',
            'data'    => $schedule,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $schedule = ProductionSchedule::findOrFail($id);

        $validated = $request->validate([
            'jops_id'      => 'sometimes|exists:jops,id',
            'tonnage'      => 'sometimes|numeric|min:0.01',
            'rewinder_cut' => 'nullable|string|max:255',
            'tph'          => 'sometimes|numeric|gt:0',
            'start_time'   => 'sometimes|date',
            'remark'       => 'nullable|string',
        ]);

        // Recalculate if tonnage or tph changed
        $tonnage    = $validated['tonnage']    ?? $schedule->tonnage;
        $tph        = $validated['tph']        ?? $schedule->tph;
        $startTime  = isset($validated['start_time'])
            ? Carbon::parse($validated['start_time'])
            : Carbon::parse($schedule->start_time);

        $productionHours = (int) ceil($tonnage / $tph);
        $stopTime        = $startTime->copy()->addHours($productionHours);

        $schedule->update(array_merge($validated, [
            'production_hours' => $productionHours,
            'start_time'       => $startTime,
            'stop_time'        => $stopTime,
        ]));

        return response()->json([
            'message' => 'Production schedule updated successfully.',
            'data'    => $schedule,
        ]);
    }

    public function destroy($id)
    {
        $schedule = ProductionSchedule::findOrFail($id);
        $schedule->delete();
        return response()->json(['message' => 'Production schedule deleted.']);
    }
}
