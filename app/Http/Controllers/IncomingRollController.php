<?php

namespace App\Http\Controllers;

use App\Models\Roll;
use App\Models\Shift;
use App\Models\Grade;
use App\Models\Gsm;
use App\Models\Plybond;
use App\Models\Thickness;
use App\Models\RollsWidth;
use App\Models\RollsDiameter;
use App\Models\Core;
use App\Models\Cobb;
use App\Models\Jop;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class IncomingRollController extends Controller
{
    public function step1(Request $request)
    {
        $request->validate(['weight' => 'required|numeric']);
        session(['incoming_roll_weight' => $request->weight]);
        return response()->json(['message' => 'Weight saved temporarily']);
    }

    public function step2()
    {
        return response()->json(['weight' => session('incoming_roll_weight')]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'rollNumber' => 'required|string',
            'formNumber' => 'nullable|string',
            'shift'      => 'nullable|string',
            'jop'        => 'nullable|string',
            'grade'      => 'nullable|string',
            'gsm'        => 'nullable|string',
            'plybond'    => 'nullable|string',
            'thickness'  => 'nullable|string',
            'bulk'       => 'nullable|string',
            'width'      => 'nullable|string',
            'diameter'   => 'nullable|string',
            'core'       => 'nullable|string',
            'cobb'       => 'nullable|string',
            'exMaterial' => 'nullable|string',
            'visual'     => 'nullable|string',
            'pic'        => 'nullable|string',
            'weight'     => 'nullable|numeric',
        ]);

        DB::beginTransaction();
        try {
            // 1. Roll Number & Primary Key
            $rollNumber = trim($request->rollNumber);
            
            $isUpdate = $request->boolean('is_update');
            
            // Check if roll already exists
            $existingRoll = Roll::where('no_roll', $rollNumber)->first();
            if ($existingRoll && !$isUpdate) {
                DB::rollBack();
                return response()->json([
                    'status' => 'error',
                    'message' => "Roll Number '{$rollNumber}' already exists in database!"
                ], 422);
            }

            $maxNo = Roll::max('no') ?? 0;
            $newNo = $maxNo + 1;

            // 2. Resolve Master Relations (firstOrCreate)
            // Shift
            $shiftName = $request->shift ? trim($request->shift) : 'Shift A';
            $shift = Shift::firstOrCreate(['shift' => $shiftName]);

            // Grade
            $gradeName = $request->grade ? trim($request->grade) : 'KLB-150';
            $grade = Grade::firstOrCreate(['grade' => $gradeName]);

            // GSM
            $gsmVal = $request->gsm ? floatval($request->gsm) : 150;
            $gsm = Gsm::firstOrCreate(['gsm' => $gsmVal]);

            // Jop
            $jopId = null;
            if ($request->jop) {
                $jopCode = trim($request->jop);
                $jopObj = Jop::where('jop', $jopCode)->first();
                if (!$jopObj) {
                    $jopObj = Jop::create([
                        'jop' => $jopCode,
                        'spk' => 'SPK-' . rand(100, 999),
                        'grades_id' => $grade->id,
                        'gsms_id' => $gsm->id,
                    ]);
                }
                $jopId = $jopObj->id;
            }

            // Plybond
            $plybondId = null;
            if ($request->plybond) {
                $pVal = trim($request->plybond);
                $plybond = Plybond::firstOrCreate(['plybonds' => $pVal]);
                $plybondId = $plybond->id;
            }

            // Thickness
            $thicknessId = null;
            if ($request->thickness) {
                $tVal = trim($request->thickness);
                $thickness = Thickness::firstOrCreate(['thickness' => $tVal]);
                $thicknessId = $thickness->id;
            }

            // Width
            if ($request->width) {
                $wVal = floatval($request->width);
                RollsWidth::firstOrCreate(['width' => $wVal]);
            }

            // Diameter
            $diameterId = null;
            if ($request->diameter) {
                $dVal = floatval($request->diameter);
                $diameter = RollsDiameter::firstOrCreate(['diameter' => $dVal]);
                $diameterId = $diameter->id;
            }

            // Core
            $coreId = null;
            if ($request->core) {
                $cVal = trim($request->core);
                $core = Core::firstOrCreate(['core' => $cVal]);
                $coreId = $core->id;
            }

            // Cobb
            $cobbId = null;
            if ($request->cobb) {
                $cobbStr = trim($request->cobb);
                $cobb = Cobb::firstOrCreate(['cobb' => $cobbStr]);
                $cobbId = $cobb->id;
            }

            // Bulk (handle comma like "1,4" to 1.4)
            $bulkVal = null;
            if ($request->bulk !== null && $request->bulk !== '') {
                $cleanBulk = str_replace(',', '.', trim($request->bulk));
                $bulkVal = floatval($cleanBulk);
            }

            // User / PIC
            $userId = auth()->id();
            if (!$userId && $request->pic) {
                $userObj = User::where('name', 'like', '%' . trim($request->pic) . '%')->first();
                if ($userObj) {
                    $userId = $userObj->id;
                }
            }
            if (!$userId) {
                $firstUser = User::first();
                $userId = $firstUser ? $firstUser->id : 1;
            }

            // Ex Material enum
            $exMat = strtoupper(trim($request->exMaterial ?? 'IMPORT'));
            if (!in_array($exMat, ['IMPORT', 'LOCAL'])) {
                $exMat = 'IMPORT';
            }

            // Form number
            $formNum = $request->formNumber ? intval(preg_replace('/[^0-9]/', '', $request->formNumber)) : 1;

            // Weight
            $weightVal = $request->weight ? intval($request->weight) : 0;

            // 3. Create or Update Roll
            if ($existingRoll && $isUpdate) {
                $existingRoll->update([
                    'form'               => $formNum,
                    'shifts_id'          => $shift->id,
                    'grades_id'          => $grade->id,
                    'plybonds_id'        => $plybondId,
                    'thicknesses_id'     => $thicknessId,
                    'bulk'               => $bulkVal,
                    'rolls_diameters_id' => $diameterId,
                    'weight'             => $weightVal,
                    'cores_id'           => $coreId,
                    'cobbs_id'           => $cobbId,
                    'exmaterial'         => $exMat,
                    'visual'             => $request->visual ?? 'OK',
                    'users_id'           => $userId,
                    'jops_id'            => $jopId,
                ]);
                $roll = $existingRoll;
            } else {
                $roll = Roll::create([
                    'no'                 => $newNo,
                    'no_roll'            => $rollNumber,
                    'form'               => $formNum,
                    'shifts_id'          => $shift->id,
                    'entry_date'         => now()->toDateString(),
                    'grades_id'          => $grade->id,
                    'plybonds_id'        => $plybondId,
                    'thicknesses_id'     => $thicknessId,
                    'bulk'               => $bulkVal,
                    'rolls_diameters_id' => $diameterId,
                    'weight'             => $weightVal,
                    'cores_id'           => $coreId,
                    'cobbs_id'           => $cobbId,
                    'exmaterial'         => $exMat,
                    'visual'             => $request->visual ?? 'OK',
                    'users_id'           => $userId,
                    'jops_id'            => $jopId,
                ]);
            }

            DB::commit();
            session()->forget('incoming_roll_weight');

            return response()->json([
                'status' => 'success',
                'message' => "Roll {$rollNumber} saved successfully to database!",
                'data' => $roll
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to save roll: ' . $e->getMessage()
            ], 500);
        }
    }
}
