<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Jop;
use Illuminate\Http\Request;
use App\Traits\ApiResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class JopController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Jop::with(['customer', 'grade', 'gsm', 'rollsWidth', 'jumboRolls'])
                    ->withCount('rolls');

        if ($customerId = $request->query('customer_id')) {
            $query->where('customers_id', $customerId);
        }

        if ($request->query('status') === 'active') {
            $query->where(function ($q) {
                $q->has('rolls', '<', DB::raw('jops.quantity'))
                  ->orWhereNull('quantity');
            });
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('spk', 'like', "%{$search}%")
                  ->orWhere('jop', 'like', "%{$search}%")
                  ->orWhere('po', 'like', "%{$search}%");
            });
        }

        $allowedSorts = ['created_at', 'spk', 'jop', 'po', 'quantity', 'weight', 'id'];
        $sort = in_array($request->query('sort'), $allowedSorts, true) ? $request->query('sort') : 'created_at';
        $order = strtolower($request->query('order', 'desc')) === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sort, $order);

        $limit = $request->query('limit', 15);

        return $this->successResponse($query->paginate($limit), 'JOP list retrieved successfully');
    }

    public function store(Request $request)
    {
        if ($request->filled('custom_customer')) {
            $cust = \App\Models\Customer::firstOrCreate(['customer' => trim($request->custom_customer)]);
            $request->merge(['customers_id' => $cust->id]);
        }
        if ($request->filled('custom_grade')) {
            $gr = \App\Models\Grade::firstOrCreate(['grade' => trim($request->custom_grade)]);
            $request->merge(['grades_id' => $gr->id]);
        }
        if ($request->filled('custom_gsm')) {
            $gsm = \App\Models\Gsm::firstOrCreate(['gsm' => floatval($request->custom_gsm)]);
            $request->merge(['gsms_id' => $gsm->id]);
        }
        if ($request->filled('custom_plybond')) {
            $pb = \App\Models\Plybond::firstOrCreate(['plybonds' => intval($request->custom_plybond)]);
            $request->merge(['plybonds_id' => $pb->id]);
        }
        if ($request->filled('custom_thickness')) {
            $th = \App\Models\Thickness::firstOrCreate(['thickness' => intval($request->custom_thickness)]);
            $request->merge(['thicknesses_id' => $th->id]);
        }
        if ($request->filled('custom_core')) {
            $cr = \App\Models\Core::firstOrCreate(['core' => trim($request->custom_core)]);
            $request->merge(['cores_id' => $cr->id]);
        }

        $validator = Validator::make($request->all(), [
            'spk' => 'required|string|max:45|unique:jops,spk',
            'jop' => 'required|string|max:45|unique:jops,jop',
            'po'  => 'nullable|string|max:45',
            'customers_id' => 'required|exists:customers,id',
            'grades_id' => 'required|exists:grades,id',
            'gsms_id' => 'required|exists:gsms,id',
            'rolls_widths_id' => 'nullable|exists:rolls_widths,id',
            'plybonds_id' => 'nullable|exists:plybonds,id',
            'thicknesses_id' => 'nullable|exists:thicknesses,id',
            'cores_id' => 'nullable|exists:cores,id',
            'quantity' => 'nullable|integer|min:1',
            'weight' => 'nullable|integer|min:1',
            'container' => 'nullable|integer|min:1',
            'noted_order' => 'nullable|string',
            'tph' => 'nullable|numeric',
            'rw_targets' => 'nullable|array',
            'rw_targets.*.width' => 'required_with:rw_targets|numeric|min:1',
            'rw_targets.*.quantity' => 'required_with:rw_targets|integer|min:1',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        $validated = $validator->validated();

        if (isset($validated['rw_targets']) && is_array($validated['rw_targets'])) {
            $totalQty = 0;
            foreach ($validated['rw_targets'] as $tgt) {
                $totalQty += (int)$tgt['quantity'];
            }
            $validated['quantity'] = $totalQty;
        }

        $rwTargets = $validated['rw_targets'] ?? [];
        unset($validated['rw_targets']);

        $jop = Jop::create($validated);

        foreach ($rwTargets as $tgt) {
            $rw = \App\Models\RollsWidth::firstOrCreate(['width' => floatval($tgt['width'])]);
            $jop->rwTargets()->create([
                'rolls_width_id' => $rw->id,
                'qty' => $tgt['quantity'],
            ]);
        }

        $jop->load(['customer', 'grade', 'gsm', 'rollsWidth', 'plybond', 'thickness', 'core', 'rwTargets.rollsWidth']);

        return $this->successResponse($jop, 'JOP created successfully', 201);
    }

    public function show(int|string $id)
    {
        $jop = Jop::with(['customer', 'grade', 'gsm', 'rollsWidth', 'plybond', 'thickness', 'core', 'rwTargets.rollsWidth', 'rolls' => function($q) {
            $q->orderBy('created_at', 'desc');
        }])->where('id', $id)->orWhere('jop', $id)->first();

        if (!$jop) {
            return $this->errorResponse('JOP not found', 404);
        }

        return $this->successResponse($jop, 'JOP detail retrieved successfully');
    }

    public function update(Request $request, int|string $id)
    {
        $jop = Jop::where('id', $id)->orWhere('jop', $id)->first();
        if (!$jop) {
            return $this->errorResponse('JOP not found', 404);
        }

        $validator = Validator::make($request->all(), [
            'spk' => 'required|string|max:45|unique:jops,spk,' . $jop->id,
            'jop' => 'required|string|max:45|unique:jops,jop,' . $jop->id,
            'po'  => 'nullable|string|max:45',
            'customers_id' => 'required|exists:customers,id',
            'grades_id' => 'required|exists:grades,id',
            'gsms_id' => 'required|exists:gsms,id',
            'rolls_widths_id' => 'nullable|exists:rolls_widths,id',
            'plybonds_id' => 'nullable|exists:plybonds,id',
            'thicknesses_id' => 'nullable|exists:thicknesses,id',
            'cores_id' => 'nullable|exists:cores,id',
            'quantity' => 'nullable|integer|min:1',
            'weight' => 'nullable|integer|min:1',
            'container' => 'nullable|integer|min:1',
            'noted_order' => 'nullable|string',
            'tph' => 'nullable|numeric',
            'rw_targets' => 'nullable|array',
            'rw_targets.*.width' => 'required_with:rw_targets|numeric|min:1',
            'rw_targets.*.quantity' => 'required_with:rw_targets|integer|min:1',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        $validated = $validator->validated();

        if (isset($validated['rw_targets']) && is_array($validated['rw_targets'])) {
            $totalQty = 0;
            foreach ($validated['rw_targets'] as $tgt) {
                $totalQty += (int)$tgt['quantity'];
            }
            $validated['quantity'] = $totalQty;
        }

        $rwTargets = $validated['rw_targets'] ?? null;
        unset($validated['rw_targets']);

        $jop->update($validated);

        if ($rwTargets !== null) {
            $jop->rwTargets()->delete();
            foreach ($rwTargets as $tgt) {
                $rw = \App\Models\RollsWidth::firstOrCreate(['width' => floatval($tgt['width'])]);
                $jop->rwTargets()->create([
                    'rolls_width_id' => $rw->id,
                    'qty' => $tgt['quantity'],
                ]);
            }
        }

        $jop->load(['customer', 'grade', 'gsm', 'rollsWidth', 'plybond', 'thickness', 'core', 'rwTargets.rollsWidth']);

        return $this->successResponse($jop, 'JOP updated successfully');
    }

    public function destroy(int|string $id)
    {
        $jop = Jop::withCount('rolls')->find($id);
        if (!$jop) {
            return $this->errorResponse('JOP not found', 404);
        }

        if ($jop->rolls_count > 0) {
            return $this->errorResponse('Cannot delete JOP because it already has associated rolls', 422);
        }

        $jop->delete();

        return $this->successResponse(null, 'JOP deleted successfully');
    }

    public function dropdownActive(Request $request)
    {

        $jops = Jop::select('id', 'jop', 'spk', 'customers_id', 'grades_id')
                   ->with(['customer:id,customer', 'grade:id,grade'])
                   ->orderBy('id', 'desc')
                   ->get()
                   ->map(function ($item) {
                       return [
                           'id' => $item->id,
                           'label' => $item->jop . ' - ' . ($item->customer->customer ?? 'Unknown'),
                           'spk' => $item->spk,
                           'customer' => $item->customer->customer ?? null,
                           'grade' => $item->grade->grade ?? null,
                       ];
                   });

        return $this->successResponse($jops, 'Active JOP dropdown list retrieved');
    }
}
