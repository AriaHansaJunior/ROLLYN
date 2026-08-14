<?php
namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\Core;
use App\Models\Cobb;
use App\Models\Plybond;
use App\Models\Thickness;
use Illuminate\Http\Request;

class SpecificationController extends Controller
{
    public function index()
    {
        return response()->json([
            'cores' => Core::all(),
            'cobbs' => Cobb::all(),
            'plybonds' => Plybond::all(),
            'thicknesses' => Thickness::all(),
        ]);
    }
}
