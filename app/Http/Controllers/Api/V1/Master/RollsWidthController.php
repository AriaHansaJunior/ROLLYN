<?php

namespace App\Http\Controllers\Api\V1\Master;

use App\Http\Controllers\Controller;
use App\Models\RollsWidth;
use Illuminate\Http\Request;
use App\Traits\ApiResponse;

class RollsWidthController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = RollsWidth::query();
        if ($search = $request->query('search')) {
            $query->where('width', 'like', '%' . $search . '%');
        }
        $allowedSorts = ['id', 'width', 'created_at'];
        $sort = in_array($request->query('sort'), $allowedSorts, true) ? $request->query('sort') : 'id';
        $order = strtolower($request->query('order', 'desc')) === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sort, $order);

        $limit = $request->query('limit', 15);
        return $this->successResponse($query->paginate($limit), 'Data retrieved successfully');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'width' => 'required|integer|unique:rolls_widths,width',
        ]);

        $RollsWidth = RollsWidth::create($validated);
        return $this->successResponse($RollsWidth, 'Data created successfully', 201);
    }

    public function show($id)
    {
        $data = RollsWidth::find($id);
        if (!$data) return $this->errorResponse('Data not found', 404);
        return $this->successResponse($data, 'Data retrieved successfully');
    }

    public function update(Request $request, $id)
    {
        $data = RollsWidth::find($id);
        if (!$data) return $this->errorResponse('Data not found', 404);

        $validated = $request->validate([
            'width' => 'required|integer|unique:rolls_widths,width,' . $id,
        ]);

        $data->update($validated);
        return $this->successResponse($data, 'Data updated successfully');
    }

    public function destroy($id)
    {
        $data = RollsWidth::find($id);
        if (!$data) return $this->errorResponse('Data not found', 404);

        try {
            $data->delete();
            return $this->successResponse(null, 'Data deleted successfully');
        } catch (\Illuminate\Database\QueryException $e) {
            return $this->errorResponse('Cannot delete Roll Width because it is referenced by existing rolls or orders.', 422);
        }
    }
}
