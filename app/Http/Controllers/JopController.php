<?php

namespace App\Http\Controllers;

use App\Models\Jop;
use App\Models\Customer;
use App\Models\Grade;
use App\Models\Gsm;
use Illuminate\Http\Request;

class JopController extends Controller
{
    public function index()
    {
        $jops = Jop::with(['customer', 'grade', 'gsm', 'rollsWidth'])->get();
        return response()->json($jops);
    }

    public function masterData()
    {
        return response()->json([
            'customers' => Customer::select('id', 'customer')->orderBy('customer')->get(),
            'grades'    => Grade::select('id', 'grade')->orderBy('grade')->get(),
            'gsms'      => Gsm::select('id', 'gsm')->orderBy('gsm')->get(),
        ]);
    }

    public function store(Request $request)
    {
        // 1. Resolve custom manual input strings if user selected "+ Add New / Input Manual..."
        if ($request->filled('custom_customer')) {
            $cust = Customer::firstOrCreate(['customer' => trim($request->custom_customer)]);
            $request->merge(['customers_id' => $cust->id]);
        }
        if ($request->filled('custom_grade')) {
            $gr = Grade::firstOrCreate(['grade' => trim($request->custom_grade)]);
            $request->merge(['grades_id' => $gr->id]);
        }
        if ($request->filled('custom_gsm')) {
            $gsm = Gsm::firstOrCreate(['gsm' => floatval($request->custom_gsm)]);
            $request->merge(['gsms_id' => $gsm->id]);
        }

        $validated = $request->validate([
            'spk' => 'required|string|max:45|unique:jops,spk',
            'jop' => 'required|string|max:45|unique:jops,jop',
            'po' => 'required|string|max:45',
            'customers_id' => 'required|exists:customers,id',
            'grades_id' => 'required|exists:grades,id',
            'gsms_id' => 'required|exists:gsms,id',
            'rolls_widths_id' => 'nullable|exists:rolls_widths,id',
            'quantity' => 'nullable|integer',
            'weight' => 'nullable|integer',
            'container' => 'nullable|integer',
            'noted_order' => 'nullable|string'
        ]);

        $jop = Jop::create($validated);
        $jop->load(['customer', 'grade', 'gsm']);

        return response()->json([
            'status' => 'success',
            'message' => 'JOP created successfully',
            'data' => $jop
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $jop = Jop::findOrFail($id);

        if ($request->filled('custom_customer')) {
            $cust = Customer::firstOrCreate(['customer' => trim($request->custom_customer)]);
            $request->merge(['customers_id' => $cust->id]);
        }
        if ($request->filled('custom_grade')) {
            $gr = Grade::firstOrCreate(['grade' => trim($request->custom_grade)]);
            $request->merge(['grades_id' => $gr->id]);
        }
        if ($request->filled('custom_gsm')) {
            $gsm = Gsm::firstOrCreate(['gsm' => floatval($request->custom_gsm)]);
            $request->merge(['gsms_id' => $gsm->id]);
        }

        $validated = $request->validate([
            'spk' => 'required|string|max:45|unique:jops,spk,' . $id,
            'jop' => 'required|string|max:45|unique:jops,jop,' . $id,
            'po' => 'required|string|max:45',
            'customers_id' => 'required|exists:customers,id',
            'grades_id' => 'required|exists:grades,id',
            'gsms_id' => 'required|exists:gsms,id',
            'rolls_widths_id' => 'nullable|exists:rolls_widths,id',
            'quantity' => 'nullable|integer',
            'weight' => 'nullable|integer',
            'container' => 'nullable|integer',
            'noted_order' => 'nullable|string'
        ]);

        $jop->update($validated);
        return response()->json(['message' => 'JOP updated successfully', 'data' => $jop]);
    }

    public function destroy($id)
    {
        $jop = Jop::findOrFail($id);
        $jop->delete();
        return response()->json(['message' => 'JOP deleted successfully']);
    }

    public function getActive()
    {
        return response()->json(Jop::all());
    }

    public function getDetails($id)
    {
        $jop = Jop::with(['grade', 'gsm', 'rollsWidth'])->findOrFail($id);
        return response()->json($jop);
    }


    public function exportExcel()
    {
        $rolls = \App\Models\Roll::with([
            'shift',
            'grade',
            'gsm',
            'plybond',
            'thickness',
            'rollsWidth',
            'rollsDiameter',
            'core',
            'cobb',
            'location',
            'user',
            'jop.customer',
            'jop.grade',
            'jop.gsm',
            'jop.rollsWidth',
        ])
        ->whereNotNull('jops_id')
        ->orderBy('jops_id', 'asc')
        ->orderBy('form', 'asc')
        ->orderBy('no', 'asc')
        ->get();

        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();

        // 1. Sheet: Data Base
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Data Base');

        // Headers matching the requested Excel layout
        $headers = [
            'A1' => 'No.',
            'B1' => 'Form Nomer',
            'C1' => 'Shift',
            'D1' => 'Tanggal Masuk WR',
            'E1' => 'Roll No',
            'F1' => 'Grade',
            'G1' => 'GSM',
            'H1' => 'Plybond',
            'I1' => 'Thickness',
            'J1' => 'Bulk',
            'K1' => 'Lebar Roll',
            'L1' => 'Diameter Roll',
            'M1' => 'Core',
            'N1' => 'Berat',
            'O1' => 'Cobb',
            'P1' => 'ExMaterial',
            'Q1' => 'Lokasi',
            'R1' => 'Visual',
            'S1' => 'JOP',
            'T1' => 'PIC',
        ];

        foreach ($headers as $cell => $val) {
            $sheet->setCellValue($cell, $val);
        }

        // Header Styling: Royal Blue background, White bold Times New Roman font, centered
        $sheet->getStyle('A1:T1')->applyFromArray([
            'font' => [
                'name' => 'Times New Roman',
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 11,
            ],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => '2B579A'],
            ],
            'alignment' => [
                'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                    'color' => ['rgb' => 'FFFFFF'],
                ],
            ],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(28);

        // Fill data rows
        $rowNum = 2;
        foreach ($rolls as $idx => $r) {
            $no          = $idx + 1;
            $formNumber  = $r->form ?? '-';
            $shift       = $r->shift->shift ?? '1';
            $tanggal     = $r->entry_date ? \Carbon\Carbon::parse($r->entry_date)->format('d M Y') : '-';
            $rollNo      = $r->no_roll ?? ('R-' . $r->no);
            $grade       = $r->grade->grade ?? $r->jop->grade->grade ?? '-';
            $gsm         = $r->gsm->gsm ?? $r->jop->gsm->gsm ?? '-';
            $plybond     = $r->plybond->plybonds ?? '-';
            $thickness   = $r->thickness->thickness ?? '-';
            $bulk        = $r->bulk !== null ? (float)$r->bulk : '-';
            $lebar       = $r->rollsWidth->width ?? $r->jop->rollsWidth->width ?? '-';
            $diameter    = $r->rollsDiameter->diameter ?? '-';
            $core        = $r->core->core ?? '-';
            $berat       = $r->weight !== null ? (float)$r->weight : 0;
            $cobb        = $r->cobb->cobb ?? '-';
            $exmaterial  = $r->exmaterial ?? 'IMPORT';
            $lokasi      = $r->location->location ?? 'Not Assigned';
            $visual      = $r->visual ?? 'OK';
            $jopNumber   = $r->jop->jop ?? '-';
            $pic         = $r->user->username ?? $r->user->name ?? 'ADMIN';

            $sheet->setCellValue('A' . $rowNum, $no);
            $sheet->setCellValue('B' . $rowNum, $formNumber);
            $sheet->setCellValue('C' . $rowNum, $shift);
            $sheet->setCellValue('D' . $rowNum, $tanggal);
            $sheet->setCellValue('E' . $rowNum, $rollNo);
            $sheet->setCellValue('F' . $rowNum, $grade);
            $sheet->setCellValue('G' . $rowNum, $gsm);
            $sheet->setCellValue('H' . $rowNum, $plybond);
            $sheet->setCellValue('I' . $rowNum, $thickness);
            $sheet->setCellValue('J' . $rowNum, $bulk);
            $sheet->setCellValue('K' . $rowNum, $lebar);
            $sheet->setCellValue('L' . $rowNum, $diameter);
            $sheet->setCellValue('M' . $rowNum, $core);
            $sheet->setCellValue('N' . $rowNum, $berat);
            $sheet->setCellValue('O' . $rowNum, $cobb);
            $sheet->setCellValue('P' . $rowNum, $exmaterial);
            $sheet->setCellValue('Q' . $rowNum, $lokasi);
            $sheet->setCellValue('R' . $rowNum, $visual);
            $sheet->setCellValue('S' . $rowNum, $jopNumber);
            $sheet->setCellValue('T' . $rowNum, $pic);

            $sheet->getRowDimension($rowNum)->setRowHeight(20);
            $rowNum++;
        }

        $lastRow = max(2, $rowNum - 1);
        $dataRange = 'A2:T' . $lastRow;

        // Data Rows Styling: Times New Roman, centered, light borders
        $sheet->getStyle($dataRange)->applyFromArray([
            'font' => [
                'name' => 'Times New Roman',
                'size' => 10,
            ],
            'alignment' => [
                'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                    'color' => ['rgb' => 'D9D9D9'],
                ],
            ],
        ]);

        // Enable AutoFilter on header row
        $sheet->setAutoFilter('A1:T' . $lastRow);

        // Column widths for optimal visibility
        $colWidths = [
            'A' => 6,   // No.
            'B' => 14,  // Form Nomer
            'C' => 8,   // Shift
            'D' => 18,  // Tanggal Masuk WR
            'E' => 20,  // Roll No
            'F' => 16,  // Grade
            'G' => 10,  // GSM
            'H' => 10,  // Plybond
            'I' => 12,  // Thickness
            'J' => 10,  // Bulk
            'K' => 12,  // Lebar Roll
            'L' => 14,  // Diameter Roll
            'M' => 8,   // Core
            'N' => 10,  // Berat
            'O' => 12,  // Cobb
            'P' => 12,  // ExMaterial
            'Q' => 14,  // Lokasi
            'R' => 10,  // Visual
            'S' => 20,  // JOP
            'T' => 14,  // PIC
        ];

        foreach ($colWidths as $col => $w) {
            $sheet->getColumnDimension($col)->setWidth($w);
        }

        // 2. Sheet: SUMMARY (as present in the reference Excel tabs)
        $summarySheet = $spreadsheet->createSheet();
        $summarySheet->setTitle('SUMMARY');
        $summarySheet->setCellValue('A1', 'Metric');
        $summarySheet->setCellValue('B1', 'Value');
        $summarySheet->setCellValue('A2', 'Total JOP');
        $summarySheet->setCellValue('B2', \App\Models\Jop::count());
        $summarySheet->setCellValue('A3', 'Total Rolls');
        $summarySheet->setCellValue('B3', $rolls->count());
        $summarySheet->setCellValue('A4', 'Total Weight (kg)');
        $summarySheet->setCellValue('B4', $rolls->sum('weight'));

        $summarySheet->getStyle('A1:B1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => '2B579A'],
            ],
            'alignment' => ['horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER],
        ]);
        $summarySheet->getStyle('A1:B4')->getBorders()->getAllBorders()->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN);
        $summarySheet->getColumnDimension('A')->setWidth(20);
        $summarySheet->getColumnDimension('B')->setWidth(16);

        // Return focus to the Data Base sheet
        $spreadsheet->setActiveSheetIndex(0);

        $filename = 'Database_Report_FG_' . date('Y_m_d_His') . '.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0',
        ]);
    }
}
