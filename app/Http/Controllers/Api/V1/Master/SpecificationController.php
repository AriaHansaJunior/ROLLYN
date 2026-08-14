<?php

namespace App\Http\Controllers\Api\V1\Master;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Traits\ApiResponse;
use App\Models\Core;
use App\Models\Cobb;
use App\Models\Plybond;
use App\Models\Thickness;

class SpecificationController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        return $this->successResponse([
            'cores' => Core::all(),
            'cobbs' => Cobb::all(),
            'plybonds' => Plybond::all(),
            'thicknesses' => Thickness::all(),
        ], 'Specifications retrieved successfully');
    }
}
