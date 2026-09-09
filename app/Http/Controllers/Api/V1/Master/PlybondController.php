<?php

namespace App\Http\Controllers\Api\V1\Master;

use App\Http\Controllers\Controller;
use App\Models\Plybond;
use Illuminate\Http\Request;
use App\Traits\ApiResponse;

class PlybondController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Plybond::query();
        if ($search = $request->query('search')) {
            $query->where('plybonds', 'like', '%' . $search . '%');
        }
        $allowedSorts = ['id', 'plybonds', 'created_at'];
        $sort = in_array($request->query('sort'), $allowedSorts, true) ? $request->query('sort') : 'id';
        $order = strtolower($request->query('order', 'desc')) === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sort, $order);

        $limit = $request->query('limit', 15);
        return $this->successResponse($query->paginate($limit), 'Data retrieved successfully');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'plybonds' => 'required|integer|unique:plybonds,plybonds',
        ]);

        $Plybond = Plybond::create($validated);
        return $this->successResponse($Plybond, 'Data created successfully', 201);
    }

    public function show($id)
    {
        $data = Plybond::find($id);
        if (!$data) return $this->errorResponse('Data not found', 404);
        return $this->successResponse($data, 'Data retrieved successfully');
    }

    public function update(Request $request, $id)
    {
        $data = Plybond::find($id);
        if (!$data) return $this->errorResponse('Data not found', 404);

        $validated = $request->validate([
            'plybonds' => 'required|integer|unique:plybonds,plybonds,' . $id,
        ]);

        $data->update($validated);
        return $this->successResponse($data, 'Data updated successfully');
    }

    public function destroy($id)
    {
        $data = Plybond::find($id);
        if (!$data) return $this->errorResponse('Data not found', 404);

        try {
            $data->delete();
            return $this->successResponse(null, 'Data deleted successfully');
        } catch (\Illuminate\Database\QueryException $e) {
            return $this->errorResponse('Cannot delete Plybond because it is referenced by existing rolls or orders.', 422);
        }
    }
}
