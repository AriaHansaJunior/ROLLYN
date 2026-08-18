<?php
namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\Grade;
use Illuminate\Http\Request;

class GradeController extends Controller
{
    public function index()
    {
        return response()->json(Grade::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'grade' => 'required'
        ]);

        $item = Grade::create($validated);
        return response()->json(['message' => 'Created successfully', 'data' => $item]);
    }

    public function update(Request $request, $id)
    {
        $item = Grade::findOrFail($id);

        $validated = $request->validate([
            'grade' => 'required'
        ]);

        $item->update($validated);
        return response()->json(['message' => 'Updated successfully', 'data' => $item]);
    }

    public function destroy($id)
    {
        $item = Grade::findOrFail($id);
        $item->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }
}
