<?php
namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\Gsm;
use Illuminate\Http\Request;

class GsmController extends Controller
{
    public function index()
    {
        return response()->json(Gsm::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'gsm' => 'required'
        ]);

        $item = Gsm::create($validated);
        return response()->json(['message' => 'Created successfully', 'data' => $item]);
    }

    public function update(Request $request, $id)
    {
        $item = Gsm::findOrFail($id);

        $validated = $request->validate([
            'gsm' => 'required'
        ]);

        $item->update($validated);
        return response()->json(['message' => 'Updated successfully', 'data' => $item]);
    }

    public function destroy($id)
    {
        $item = Gsm::findOrFail($id);
        $item->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }
}
