<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Roll;
use Illuminate\Http\Request;
use App\Traits\ApiResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class RollController extends Controller
{
    use ApiResponse;

    public function validateNo(Request $request)
    {
        $request->validate([
            'no_roll' => 'required|string'
        ]);

        $exists = Roll::where('no_roll', $request->no_roll)->exists();

        return $this->successResponse([
            'is_unique' => !$exists,
            'no_roll' => $request->no_roll
        ], $exists ? 'no_roll already exists' : 'no_roll is available');
    }

    public function index(Request $request)
    {
        $query = Roll::with(['shift', 'grade', 'plybond', 'thickness', 'core', 'cobb', 'location', 'user', 'jop']);

        if ($dateFrom = $request->query('date_from')) {
            $query->whereDate('entry_date', '>=', $dateFrom);
        }
        if ($dateTo = $request->query('date_to')) {
            $query->whereDate('entry_date', '<=', $dateTo);
        }
        if ($shiftId = $request->query('shift_id')) {
            $query->where('shifts_id', $shiftId);
        }
        if ($gradeId = $request->query('grade_id')) {
            $query->where('grades_id', $gradeId);
        }
        if ($jopId = $request->query('jop_id')) {
            $query->where('jops_id', $jopId);
        }
        if ($search = $request->query('search')) {
            $query->where('no_roll', 'like', "%{$search}%");
        }

        $sort = $request->query('sort', 'entry_date');
        $order = $request->query('order', 'desc');
        $query->orderBy($sort, $order);

        $limit = $request->query('limit', 15);

        return $this->successResponse($query->paginate($limit), 'Rolls retrieved successfully');
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'no_roll' => 'required|string|max:45|unique:rolls,no_roll',
            'form' => 'nullable|integer',
            'shifts_id' => 'required|exists:shifts,id',
            'entry_date' => 'required|date',
            'jops_id' => 'nullable|exists:jops,id',
            'grades_id' => 'required|exists:grades,id',
            'plybonds_id' => 'nullable|exists:plybonds,id',
            'thicknesses_id' => 'nullable|exists:thicknesses,id',
            'bulk' => 'nullable|numeric',
            'rolls_diameters_id' => 'nullable|exists:rolls_diameters,id',
            'weight' => 'nullable|integer',
            'cores_id' => 'nullable|exists:cores,id',
            'cobbs_id' => 'nullable|exists:cobbs,id',
            'exmaterial' => 'nullable|in:IMPORT,LOCAL',
            'visual' => 'nullable|string',
            'locations_id' => 'nullable|exists:locations,id',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            DB::beginTransaction();

            $data = $validator->validated();

            $maxNo = Roll::max('no');
            $data['no'] = $maxNo ? $maxNo + 1 : 1;

            $data['users_id'] = $request->user()->id;

            if (!isset($data['exmaterial'])) {
                $data['exmaterial'] = 'IMPORT';
            }

            $roll = Roll::create($data);

            DB::commit();

            $roll->load(['shift', 'grade', 'jop']);

            return $this->successResponse($roll, 'Roll transaction saved successfully', 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to save roll transaction', 500, $e->getMessage());
        }
    }

    public function show($id)
    {

        $roll = Roll::with(['shift', 'grade', 'plybond', 'thickness', 'core', 'cobb', 'location', 'user', 'jop'])->find($id);

        if (!$roll) {
            return $this->errorResponse('Roll not found', 404);
        }

        return $this->successResponse($roll, 'Roll detail retrieved successfully');
    }

    public function update(Request $request, $id)
    {
        $roll = Roll::find($id);

        if (!$roll) {
            return $this->errorResponse('Roll not found', 404);
        }

        $validator = Validator::make($request->all(), [
            'no_roll' => 'required|string|max:45|unique:rolls,no_roll,' . $id . ',no',
            'form' => 'nullable|integer',
            'shifts_id' => 'required|exists:shifts,id',
            'entry_date' => 'required|date',
            'jops_id' => 'nullable|exists:jops,id',
            'grades_id' => 'required|exists:grades,id',
            'plybonds_id' => 'nullable|exists:plybonds,id',
            'thicknesses_id' => 'nullable|exists:thicknesses,id',
            'bulk' => 'nullable|numeric',
            'rolls_diameters_id' => 'nullable|exists:rolls_diameters,id',
            'weight' => 'nullable|integer',
            'cores_id' => 'nullable|exists:cores,id',
            'cobbs_id' => 'nullable|exists:cobbs,id',
            'exmaterial' => 'nullable|in:IMPORT,LOCAL',
            'visual' => 'nullable|string',
            'locations_id' => 'nullable|exists:locations,id',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            DB::beginTransaction();

            $roll->update($validator->validated());

            DB::commit();

            return $this->successResponse($roll, 'Roll updated successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to update roll', 500, $e->getMessage());
        }
    }
}
