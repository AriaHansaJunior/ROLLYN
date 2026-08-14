<?php
namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index()
    {
        return response()->json(Customer::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer' => 'required'
        ]);

        $item = Customer::create($validated);
        return response()->json(['message' => 'Created successfully', 'data' => $item]);
    }

    public function update(Request $request, $id)
    {
        $item = Customer::findOrFail($id);
        
        $validated = $request->validate([
            'customer' => 'required'
        ]);

        $item->update($validated);
        return response()->json(['message' => 'Updated successfully', 'data' => $item]);
    }

    public function destroy($id)
    {
        $item = Customer::findOrFail($id);
        $item->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }
}
