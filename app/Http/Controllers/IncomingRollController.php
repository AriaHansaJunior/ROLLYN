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
use App\Models\Customer;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class IncomingRollController extends Controller
{
    public function index()
    {
        $jops = Jop::with(['customer', 'grade', 'gsm', 'rollsWidth', 'plybond', 'thickness', 'core', 'rolls', 'productionSchedules', 'jumboRolls'])->latest()->get();

        // Auto-start SPECTRUM Engine if it's not running (non-blocking)
        if (!app()->environment('testing')) {
            $connection = @fsockopen('127.0.0.1', 8001, $errno, $errstr, 0.2);
            if (is_resource($connection)) {
                fclose($connection);
            } else {
                $engineDir = base_path('spectrum_engine');
                try {
                    if (class_exists('COM')) {
                        $shell = new \COM("WScript.Shell");
                        $cmd = "cmd /c cd /d " . escapeshellarg($engineDir) . " && python -m uvicorn app:app --host 127.0.0.1 --port 8001";
                        $shell->Run($cmd, 0, false); // 0 = hidden window, false = do not wait
                    } else {
                        @pclose(@popen('start "" /B cmd /c "cd /d ' . escapeshellarg($engineDir) . ' && python -m uvicorn app:app --host 127.0.0.1 --port 8001 > NUL 2>&1"', 'r'));
                    }
                } catch (\Throwable $e) {
                    @pclose(@popen('start "" /B cmd /c "cd /d ' . escapeshellarg($engineDir) . ' && python -m uvicorn app:app --host 127.0.0.1 --port 8001 > NUL 2>&1"', 'r'));
                }
            }
        }

        $lastSavedRollNumber = session('last_saved_roll_number');
        $recommendedRollNumber = $lastSavedRollNumber 
            ? self::getNextRollNumber($lastSavedRollNumber) 
            : null;

        $jumboRolls = \App\Models\JumboRoll::with(['jop.customer', 'rolls'])->orderBy('id', 'desc')->get();

        return Inertia::render('IncomingRoll', [
            'jopList' => $jops,
            'jumboRolls' => $jumboRolls,
            'lastSavedRollNumber' => $lastSavedRollNumber,
            'recommendedRollNumber' => $recommendedRollNumber,
        ]); 
    }

    /**
     * Backward-compatible alias
     */
    public function incomingRoll()
    {
        return $this->index();
    }
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

    public function checkRollNumber(Request $request)
    {
        $rollNumber = trim($request->input('rollNumber', ''));
        if (!$rollNumber) {
            return response()->json(['exists' => false]);
        }

        $roll = Roll::where('no_roll', $rollNumber)
            ->with(['grade', 'gsm', 'shift', 'jop'])
            ->first();

        if ($roll) {
            return response()->json([
                'exists' => true,
                'message' => "Roll Number '{$rollNumber}' is already registered in the database!",
                'roll' => [
                    'no_roll' => $roll->no_roll,
                    'grade' => $roll->grade?->grade ?? '-',
                    'gsm' => $roll->gsm?->gsm ?? '-',
                    'shift' => $roll->shift?->shift ?? '-',
                    'entry_date' => $roll->entry_date,
                    'status' => $roll->status ?? 'OK',
                ]
            ]);
        }

        return response()->json(['exists' => false]);
    }

    public function recommendFormNumber(Request $request)
    {
        $jopCode = $request->input('jop');
        $gradeName = $request->input('grade');
        $widthVal = $request->input('width');
        $entryDate = $request->input('entry_date');

        if ($jopCode && $gradeName && $widthVal) {
            $jop = Jop::where('jop', trim($jopCode))->first();
            $grade = Grade::where('grade', trim($gradeName))->first();
            $width = RollsWidth::where('width', floatval($widthVal))->first();

            if ($jop && $grade && $width) {
                $query = Roll::where('jops_id', $jop->id)
                    ->where('grades_id', $grade->id)
                    ->where('rolls_widths_id', $width->id)
                    ->whereNotNull('form');

                if ($entryDate) {
                    $query->where('entry_date', $entryDate);
                }

                $existingRoll = $query->orderBy('created_at', 'desc')->first();

                if ($existingRoll) {
                    return response()->json(['formNumber' => $existingRoll->form]);
                }
            }
        }

        $maxForm = Roll::max('form') ?? 0;
        return response()->json(['formNumber' => $maxForm + 1]);
    }

    /**
     * Get or recommend Jumbo Roll number based on selected JOP.
     */
    public function recommendJumboRoll(Request $request)
    {
        $jopCode = trim($request->input('jop', ''));
        if (!$jopCode) {
            return response()->json([
                'jumbo_roll' => null,
                'jumbo_roll_id' => null,
                'status' => null,
                'existing_rolls' => [],
            ]);
        }

        $jop = Jop::where('jop', $jopCode)->with('jumboRolls')->first();
        if (!$jop) {
            $derived = preg_replace('/^JOP-/i', 'JR-', $jopCode);
            if (!str_starts_with(strtoupper($derived), 'JR-')) {
                $derived = 'JR-' . $derived;
            }
            return response()->json([
                'jumbo_roll' => $derived,
                'jumbo_roll_id' => null,
                'status' => null,
                'existing_rolls' => [],
            ]);
        }

        $existing = $jop->jumboRolls;
        if ($existing->isNotEmpty()) {
            $inProgress = $existing->firstWhere('status', 'IN_PROGRESS');
            $chosen = $inProgress ?? $existing->sortByDesc('id')->first();
            return response()->json([
                'jumbo_roll' => $chosen->jumbo_roll_number,
                'jumbo_roll_id' => $chosen->id,
                'status' => $chosen->status,
                'existing_rolls' => $existing->map(fn($r) => [
                    'id' => $r->id,
                    'jumbo_roll_number' => $r->jumbo_roll_number,
                    'status' => $r->status,
                    'weight' => (float)$r->weight,
                ])->values(),
            ]);
        }

        // Auto-generate based on JOP
        $derived = preg_replace('/^JOP-/i', 'JR-', $jop->jop);
        if (!str_starts_with(strtoupper($derived), 'JR-')) {
            $derived = 'JR-' . $derived;
        }

        return response()->json([
            'jumbo_roll' => $derived,
            'jumbo_roll_id' => null,
            'status' => null,
            'existing_rolls' => [],
        ]);
    }

    /**
     * Calculate next recommended roll number based on last successfully saved roll number (+1).
     */
    public static function getNextRollNumber(?string $lastRoll): ?string
    {
        if (!$lastRoll || trim($lastRoll) === '') {
            return null;
        }

        $trimmed = trim($lastRoll);

        // Pattern matching: prefix + digits (e.g. "2000" -> "", "2000"; "R-10425" -> "R-", "10425")
        if (preg_match('/^(.*?)(\d+)$/', $trimmed, $matches)) {
            $prefix = $matches[1];
            $digits = $matches[2];

            if (function_exists('bcadd')) {
                $nextNum = bcadd($digits, '1');
            } else {
                $nextNum = strval((int)$digits + 1);
            }

            // Preserve leading zeroes if original had them
            if (strlen($digits) > 1 && $digits[0] === '0' && strlen($nextNum) < strlen($digits)) {
                $nextNum = str_pad($nextNum, strlen($digits), '0', STR_PAD_LEFT);
            }

            return $prefix . $nextNum;
        }

        return null;
    }

    /**
     * Get the current recommended roll number from session.
     */
    public function getRecommendedRollNumber()
    {
        $lastSaved = session('last_saved_roll_number');
        $recommended = $lastSaved ? self::getNextRollNumber($lastSaved) : null;

        return response()->json([
            'last_saved_roll_number' => $lastSaved,
            'recommended_roll_number' => $recommended,
        ]);
    }

    public function store(Request $request)
    {
        // Normalize commas to dots for numeric fields if present
        $numericInputs = ['gsm', 'width', 'plybond', 'bulk', 'cobb', 'thickness', 'core'];
        $normalized = [];
        foreach ($numericInputs as $field) {
            if ($request->has($field) && $request->$field !== null && $request->$field !== '') {
                $normalized[$field] = str_replace(',', '.', trim($request->$field));
            }
        }
        if (!empty($normalized)) {
            $request->merge($normalized);
        }

        $request->validate([
            'rollNumber' => 'required|string',
            'formNumber' => 'nullable|string',
            'shift'      => 'nullable|string',
            'jop'        => 'nullable|string',
            'grade'      => 'nullable|string',
            'gsm'        => 'nullable|numeric',
            'plybond'    => 'nullable|numeric',
            'thickness'  => 'nullable|numeric',
            'bulk'       => 'nullable|numeric',
            'width'      => 'nullable|numeric',
            'diameter'   => 'nullable|string',
            'core'       => 'nullable|numeric',
            'cobb'       => 'nullable|numeric',
            'exMaterial' => 'nullable|string',
            'visual'     => 'nullable|string',
            'status'     => 'nullable|string',
            'entry_date' => 'nullable|string',
            'pic'        => 'nullable|string',
            'weight'        => 'nullable|numeric',
            'jumbo_roll_id' => 'nullable',
            'jumbo_roll'    => 'nullable|string',
            'jumboRoll'     => 'nullable|string',
            'jumboRollId'   => 'nullable',
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
            $shiftName = $request->shift ? trim($request->shift) : '1';
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
                    $defaultCustomer = Customer::firstOrCreate(['customer' => 'GENERAL']);
                    $jopObj = Jop::create([
                        'jop' => $jopCode,
                        'spk' => 'SPK-' . strtoupper(substr(uniqid(), -6)),
                        'po' => 'PO-' . date('Ymd'),
                        'customers_id' => $defaultCustomer->id,
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
            $widthId = null;
            if ($request->width) {
                $wVal = floatval($request->width);
                $width = RollsWidth::firstOrCreate(['width' => $wVal]);
                $widthId = $width->id;
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
            $userId = Auth::id();
            if (!$userId && $request->pic) {
                $userObj = User::where('username', 'like', '%' . trim($request->pic) . '%')->first();
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

            $entryDate = $request->entry_date ? trim($request->entry_date) : now()->toDateString();
            $formNum = $request->formNumber ? intval(preg_replace('/[^0-9]/', '', $request->formNumber)) : 1;

            // Form Serah Terima Cross-Contamination Validation
            if ($formNum) {
                $existingFormRoll = Roll::where('form', $formNum)->first();
                if ($existingFormRoll) {
                    if ($existingFormRoll->jops_id !== $jopId ||
                        $existingFormRoll->grades_id !== $grade->id ||
                        $existingFormRoll->rolls_widths_id !== $widthId ||
                        $existingFormRoll->entry_date !== $entryDate) {
                        DB::rollBack();
                        return response()->json([
                            'status' => 'error',
                            'message' => "Form Number {$formNum} is already used for different specifications (Jumbo/Grade/Width/Date). Please use a different Form Number."
                        ], 422);
                    }
                }
            }

            // Weight
            $weightVal = $request->weight ? intval($request->weight) : 0;

            // Status and Entry Date
            $statusVal = strtoupper(trim($request->status ?? 'OK'));
            if (!in_array($statusVal, ['OK', 'HOLD'])) $statusVal = 'OK';

            $entryDate = $request->entry_date ? trim($request->entry_date) : now()->toDateString();

            // Resolve Jumbo Roll relationship if provided
            $jumboRollId = $request->input('jumbo_roll_id') ?? $request->input('jumboRollId');
            $jumboRollNumber = trim($request->input('jumbo_roll') ?? $request->input('jumboRoll') ?? '');

            if ($jumboRollId) {
                $jr = \App\Models\JumboRoll::find($jumboRollId);
                if (!$jr && $jumboRollNumber !== '') {
                    $jumboRollId = null;
                }
            }

            if (!$jumboRollId && $jumboRollNumber !== '') {
                $jr = \App\Models\JumboRoll::where('jumbo_roll_number', $jumboRollNumber)->first();
                if (!$jr && $jopId) {
                    $jr = \App\Models\JumboRoll::create([
                        'jumbo_roll_number' => $jumboRollNumber,
                        'jops_id'           => $jopId,
                        'weight'            => $weightVal > 0 ? $weightVal : (float)($jopObj->weight ?? 0),
                        'production_date'   => $entryDate,
                        'status'            => 'IN_PROGRESS',
                        'users_id'          => $userId,
                        'notes'             => 'Auto-created from Incoming Roll',
                    ]);
                }
                if ($jr) {
                    $jumboRollId = $jr->id;
                }
            }

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
                    'rolls_widths_id'    => $widthId,
                    'weight'             => $weightVal,
                    'cores_id'           => $coreId,
                    'cobbs_id'           => $cobbId,
                    'exmaterial'         => $exMat,
                    'visual'             => $request->visual ?? 'OK',
                    'status'             => $statusVal,
                    'entry_date'         => $entryDate,
                    'users_id'           => $userId,
                    'jops_id'            => $jopId,
                    'gsms_id'            => $gsm->id,
                    'jumbo_roll_id'      => $jumboRollId ?? $existingRoll->jumbo_roll_id,
                ]);
                $roll = $existingRoll;
            } else {
                $roll = Roll::create([
                    'no'                 => $newNo,
                    'no_roll'            => $rollNumber,
                    'form'               => $formNum,
                    'shifts_id'          => $shift->id,
                    'entry_date'         => $entryDate,
                    'grades_id'          => $grade->id,
                    'plybonds_id'        => $plybondId,
                    'thicknesses_id'     => $thicknessId,
                    'bulk'               => $bulkVal,
                    'rolls_diameters_id' => $diameterId,
                    'rolls_widths_id'    => $widthId,
                    'weight'             => $weightVal,
                    'cores_id'           => $coreId,
                    'cobbs_id'           => $cobbId,
                    'exmaterial'         => $exMat,
                    'visual'             => $request->visual ?? 'OK',
                    'status'             => $statusVal,
                    'users_id'           => $userId,
                    'jops_id'            => $jopId,
                    'gsms_id'            => $gsm->id,
                    'jumbo_roll_id'      => $jumboRollId,
                ]);
            }

            // Store the latest successfully saved roll number in session (Sections 4 & 5)
            session(['last_saved_roll_number' => $rollNumber]);
            $nextRecommended = self::getNextRollNumber($rollNumber);

            DB::commit();
            session()->forget('incoming_roll_weight');

            return response()->json([
                'status' => 'success',
                'message' => "Roll {$rollNumber} saved successfully to database!",
                'data' => $roll,
                'last_saved_roll_number' => $rollNumber,
                'recommended_roll_number' => $nextRecommended,
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
