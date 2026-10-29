<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Roll;
use App\Models\Location;
use App\Models\LocationRecommendationLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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

        $allowedSorts = ['entry_date', 'no_roll', 'weight', 'created_at', 'no', 'form', 'status'];
        $sort = in_array($request->query('sort'), $allowedSorts, true) ? $request->query('sort') : 'entry_date';
        $order = strtolower($request->query('order', 'desc')) === 'asc' ? 'asc' : 'desc';
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
            'gsms_id' => 'nullable|exists:gsms,id',
            'rolls_widths_id' => 'nullable|exists:rolls_widths,id',
            'plybonds_id' => 'nullable|exists:plybonds,id',
            'thicknesses_id' => 'nullable|exists:thicknesses,id',
            'bulk' => 'nullable|numeric',
            'rolls_diameters_id' => 'nullable|exists:rolls_diameters,id',
            'weight' => 'nullable|integer',
            'cores_id' => 'nullable|exists:cores,id',
            'cobbs_id' => 'nullable|exists:cobbs,id',
            'exmaterial' => 'nullable|in:IMPORT,LOCAL',
            'visual' => 'nullable|string',
            'status' => 'nullable|in:OK,HOLD',
            'jumbo_roll_id' => 'nullable|exists:jumbo_rolls,id',
            'locations_id' => 'nullable|exists:locations,id',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            DB::beginTransaction();

            $data = $validator->validated();

            if (!empty($data['locations_id'])) {
                $targetLoc = Location::find($data['locations_id']);
                if ($targetLoc && $targetLoc->isFull()) {
                    DB::rollBack();
                    return $this->errorResponse('This slot is already full (maximum 4 rolls).', 422);
                }
            }

            $maxNo = Roll::max('no');
            $data['no'] = $maxNo ? $maxNo + 1 : 1;

            $data['users_id'] = $request->user()->id;

            if (!isset($data['exmaterial'])) {
                $data['exmaterial'] = 'IMPORT';
            }

            $roll = Roll::create($data);

            if (!empty($roll->locations_id)) {
                Location::find($roll->locations_id)?->syncState();
            }

            \App\Models\SystemNotification::create([
                'type' => 'incoming',
                'title' => 'Incoming Roll',
                'message' => "Roll {$roll->no_roll} ({$roll->weight} kg) has been successfully recorded.",
                'is_unread' => true,
            ]);

            DB::commit();

            $roll->load(['shift', 'grade', 'gsm', 'rollsWidth', 'rollsDiameter', 'jop']);

            return $this->successResponse($roll, 'Roll transaction saved successfully', 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to save roll transaction', 500, $e->getMessage());
        }
    }

    public function show($id)
    {
        $roll = Roll::with(['shift', 'grade', 'gsm', 'rollsWidth', 'rollsDiameter', 'plybond', 'thickness', 'core', 'cobb', 'location', 'user', 'jop', 'jumboRoll'])->where('no', $id)->orWhere('no_roll', $id)->first();

        if (!$roll) {
            return $this->errorResponse('Roll not found', 404);
        }

        return $this->successResponse($roll, 'Roll detail retrieved successfully');
    }

    public function update(Request $request, $id)
    {
        $roll = Roll::findByRollNumber($id);

        if (!$roll) {
            return $this->errorResponse('Roll not found', 404);
        }

        $validator = Validator::make($request->all(), [
            'no_roll' => 'required|string|max:45|unique:rolls,no_roll,' . $roll->no . ',no',
            'form' => 'nullable|integer',
            'shifts_id' => 'required|exists:shifts,id',
            'entry_date' => 'required|date',
            'jops_id' => 'nullable|exists:jops,id',
            'grades_id' => 'required|exists:grades,id',
            'gsms_id' => 'nullable|exists:gsms,id',
            'rolls_widths_id' => 'nullable|exists:rolls_widths,id',
            'plybonds_id' => 'nullable|exists:plybonds,id',
            'thicknesses_id' => 'nullable|exists:thicknesses,id',
            'bulk' => 'nullable|numeric',
            'rolls_diameters_id' => 'nullable|exists:rolls_diameters,id',
            'weight' => 'nullable|integer',
            'cores_id' => 'nullable|exists:cores,id',
            'cobbs_id' => 'nullable|exists:cobbs,id',
            'exmaterial' => 'nullable|in:IMPORT,LOCAL',
            'visual' => 'nullable|string',
            'status' => 'nullable|in:OK,HOLD',
            'jumbo_roll_id' => 'nullable|exists:jumbo_rolls,id',
            'locations_id' => 'nullable|exists:locations,id',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            DB::beginTransaction();

            $validated = $validator->validated();

            $oldLocationId = $roll->locations_id;
            $newLocationId = array_key_exists('locations_id', $validated) ? $validated['locations_id'] : $oldLocationId;

            if ($newLocationId && $newLocationId != $oldLocationId) {
                $targetLoc = Location::find($newLocationId);
                if ($targetLoc && $targetLoc->isFull($roll->no)) {
                    DB::rollBack();
                    return $this->errorResponse('This slot is already full (maximum 4 rolls). Please select another slot.', 422);
                }
            }

            if (array_key_exists('locations_id', $validated) && $validated['locations_id'] != $roll->locations_id) {
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

            if ($oldLocationId != $newLocationId) {
                Location::find($oldLocationId)?->syncState();
                Location::find($newLocationId)?->syncState();
            }

            DB::commit();

            return $this->successResponse($roll, 'Roll updated successfully');

            DB::commit();

            return $this->successResponse($roll, 'Roll updated successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to update roll', 500, $e->getMessage());
        }
    }
}
