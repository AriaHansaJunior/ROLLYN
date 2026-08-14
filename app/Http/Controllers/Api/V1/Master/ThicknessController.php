<?php

namespace App\Http\Controllers\Api\V1\Master;

use App\Http\Controllers\Controller;
use App\Models\Thickness;
use Illuminate\Http\Request;
use App\Traits\ApiResponse;

class ThicknessController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Thickness::query();
        if ($search = $request->query('search')) {
            $query->where('thickness', 'like', '%' . $search . '%');
        }
        if ($sort = $request->query('sort')) {
            $query->orderBy($sort, $request->query('order', 'asc'));
        } else {
            $query->orderBy('id', 'desc');
        }
        
        $limit = $request->query('limit', 15);
        return $this->successResponse($query->paginate($limit), 'Data retrieved successfully');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'thickness' => 'required|integer|unique:thicknesses,thickness',
        ]);

        $Thickness = Thickness::create($validated);
        return $this->successResponse($Thickness, 'Data created successfully', 201);
    }

    public function show($id)
    {
        $data = Thickness::find($id);
        if (!$data) return $this->errorResponse('Data not found', 404);
        return $this->successResponse($data, 'Data retrieved successfully');
    }

    public function update(Request $request, $id)
    {
        $data = Thickness::find($id);
        if (!$data) return $this->errorResponse('Data not found', 404);

        $validated = $request->validate([
            'thickness' => 'required|integer|unique:thicknesses,thickness,' . $id,
        ]);

        $data->update($validated);
        return $this->successResponse($data, 'Data updated successfully');
    }

    public function destroy($id)
    {
        $data = Thickness::find($id);
        if (!$data) return $this->errorResponse('Data not found', 404);

        $data->delete();
        return $this->successResponse(null, 'Data deleted successfully');
    }
}
