<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Jop;
use Illuminate\Http\Request;
use App\Traits\ApiResponse;
use Illuminate\Support\Facades\Validator;

class JopController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Jop::with(['customer', 'grade', 'gsm', 'rollsWidth'])
                    ->withCount('rolls');

        if ($customerId = $request->query('customer_id')) {
            $query->where('customers_id', $customerId);
        }

        if ($request->query('status') === 'active') {
            $query->where(function ($q) {
                $q->has('rolls', '<', \DB::raw('jops.quantity'))
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

        $sort = $request->query('sort', 'created_at');
        $order = $request->query('order', 'desc');
        $query->orderBy($sort, $order);

        $limit = $request->query('limit', 15);

        return $this->successResponse($query->paginate($limit), 'JOP list retrieved successfully');
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'spk' => 'required|string|max:45|unique:jops,spk',
            'jop' => 'required|string|max:45|unique:jops,jop',
            'po'  => 'nullable|string|max:45',
            'customers_id' => 'required|exists:customers,id',
            'grades_id' => 'required|exists:grades,id',
            'gsms_id' => 'required|exists:gsms,id',
            'rolls_widths_id' => 'nullable|exists:rolls_widths,id',
            'quantity' => 'nullable|integer|min:1',
            'weight' => 'nullable|integer|min:1',
            'container' => 'nullable|integer|min:1',
            'noted_order' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        $jop = Jop::create($validator->validated());

        $jop->load(['customer', 'grade', 'gsm', 'rollsWidth']);

        return $this->successResponse($jop, 'JOP created successfully', 201);
    }

    public function show($id)
    {
        $jop = Jop::with(['customer', 'grade', 'gsm', 'rollsWidth', 'rolls' => function($q) {
            $q->orderBy('created_at', 'desc');
        }])->find($id);

        if (!$jop) {
            return $this->errorResponse('JOP not found', 404);
        }

        return $this->successResponse($jop, 'JOP detail retrieved successfully');
    }

    public function update(Request $request, $id)
    {
        $jop = Jop::find($id);
        if (!$jop) {
            return $this->errorResponse('JOP not found', 404);
        }

        $validator = Validator::make($request->all(), [
            'spk' => 'required|string|max:45|unique:jops,spk,' . $id,
            'jop' => 'required|string|max:45|unique:jops,jop,' . $id,
            'po'  => 'nullable|string|max:45',
            'customers_id' => 'required|exists:customers,id',
            'grades_id' => 'required|exists:grades,id',
            'gsms_id' => 'required|exists:gsms,id',
            'rolls_widths_id' => 'nullable|exists:rolls_widths,id',
            'quantity' => 'nullable|integer|min:1',
            'weight' => 'nullable|integer|min:1',
            'container' => 'nullable|integer|min:1',
            'noted_order' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        $jop->update($validator->validated());

        return $this->successResponse($jop, 'JOP updated successfully');
    }

    public function destroy($id)
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
