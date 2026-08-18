<?php
namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use Illuminate\Http\Request;

class ShiftController extends Controller
{
    public function index()
    {
        return response()->json(Shift::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'shift' => 'required'
        ]);

        $item = Shift::create($validated);
        return response()->json(['message' => 'Created successfully', 'data' => $item]);
    }

    public function update(Request $request, $id)
    {
        $item = Shift::findOrFail($id);

        $validated = $request->validate([
            'shift' => 'required'
        ]);

        $item->update($validated);
        return response()->json(['message' => 'Updated successfully', 'data' => $item]);
    }

    public function destroy($id)
    {
        $item = Shift::findOrFail($id);
        $item->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }
}
