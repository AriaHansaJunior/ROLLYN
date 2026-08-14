<?php

namespace App\Http\Controllers\Api\V1\Master;

use App\Http\Controllers\Controller;
use App\Models\Core;
use Illuminate\Http\Request;
use App\Traits\ApiResponse;

class CoreController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Core::query();
        if ($search = $request->query('search')) {
            $query->where('core', 'like', '%' . $search . '%');
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
            'core' => 'required|string|unique:cores,core',
        ]);

        $Core = Core::create($validated);
        return $this->successResponse($Core, 'Data created successfully', 201);
    }

    public function show($id)
    {
        $data = Core::find($id);
        if (!$data) return $this->errorResponse('Data not found', 404);
        return $this->successResponse($data, 'Data retrieved successfully');
    }

    public function update(Request $request, $id)
    {
        $data = Core::find($id);
        if (!$data) return $this->errorResponse('Data not found', 404);

        $validated = $request->validate([
            'core' => 'required|string|unique:cores,core,' . $id,
        ]);

        $data->update($validated);
        return $this->successResponse($data, 'Data updated successfully');
    }

    public function destroy($id)
    {
        $data = Core::find($id);
        if (!$data) return $this->errorResponse('Data not found', 404);

        $data->delete();
        return $this->successResponse(null, 'Data deleted successfully');
    }
}
