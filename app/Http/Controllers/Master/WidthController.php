<?php
namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\RollsWidth;
use Illuminate\Http\Request;

class WidthController extends Controller
{
    public function index()
    {
        return response()->json(RollsWidth::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'width' => 'required'
        ]);

        $item = RollsWidth::create($validated);
        return response()->json(['message' => 'Created successfully', 'data' => $item]);
    }

    public function update(Request $request, $id)
    {
        $item = RollsWidth::findOrFail($id);

        $validated = $request->validate([
            'width' => 'required'
        ]);

        $item->update($validated);
        return response()->json(['message' => 'Updated successfully', 'data' => $item]);
    }

    public function destroy($id)
    {
        $item = RollsWidth::findOrFail($id);
        $item->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }
}
