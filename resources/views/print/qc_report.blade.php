<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QC Inspection Report - {{ $shipment->shipment_number }}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 10mm;
        }
        body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 0;
        }
        
        /* HEADER STYLES */
        .header {
            display: flex;
            border: 2px solid #000;
            margin-bottom: 20px;
        }
        .header-left {
            width: 15%;
            border-right: 1px solid #000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 5px;
        }
        .logo-placeholder {
            width: 70px;
            height: 70px;
            border-radius: 50%;
            border: 3px solid #1a4a8d;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            font-weight: 900;
            color: #1a4a8d;
            background-color: #f0f4f8;
        }
        .header-center {
            width: 50%;
            border-right: 1px solid #000;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            padding: 5px;
        }
        .header-center h2 {
            margin: 0 0 5px 0;
            font-size: 18px;
            font-weight: bold;
        }
        .header-center h3 {
            margin: 0;
            font-size: 13px;
            font-weight: bold;
        }
        .header-right {
            width: 35%;
            display: flex;
        }
        .header-right table {
            width: 100%;
            border-collapse: collapse;
            height: 100%;
        }
        .header-right table td {
            border: 1px solid #000;
            border-right: none;
            border-top: none;
            padding: 3px 5px;
            font-size: 11px;
            font-weight: bold;
            white-space: nowrap;
        }
        .header-right table tr:last-child td {
            border-bottom: none;
        }
        .header-right table td:first-child {
            width: 45%;
        }

        /* META INFO STYLES */
        .meta-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 11px;
            font-weight: bold;
        }
        .meta-col {
            width: 48%;
        }
        .meta-row {
            display: flex;
            margin-bottom: 8px;
            align-items: flex-end;
        }
        .meta-label {
            width: 110px;
            flex-shrink: 0;
        }
        .meta-value {
            flex-grow: 1;
            padding-bottom: 2px;
            padding-left: 5px;
            min-height: 16px;
        }

        /* CHECKLIST TABLE STYLES */
        .checklist-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000;
            margin-bottom: 5px;
        }
        .checklist-table th, .checklist-table td {
            border: 1px solid #000;
            padding: 3px 5px;
            font-size: 11px;
        }
        .checklist-table th {
            font-weight: bold;
            background-color: #e5e5e5;
            text-align: center;
        }
        .checklist-table .category-row td {
            background-color: #f5f5f5;
            font-weight: bold;
            text-align: center;
        }
        .checklist-table td.text-center {
            text-align: center;
        }
        
        /* Column widths */
        .checklist-table th:nth-child(1) { width: 5%; }
        .checklist-table th:nth-child(2) { width: 45%; }
        .checklist-table th:nth-child(3) { width: 8%; }
        .checklist-table th:nth-child(4) { width: 8%; }
        .checklist-table th:nth-child(5) { width: 34%; }

        .check-mark {
            font-weight: bold;
            font-size: 16px;
        }
        .not-ok-row {
            background-color: #fff9e6; /* light amber */
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        /* FOOTER STYLES */
        .footer-note {
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .signatures {
            display: flex;
            justify-content: flex-end;
            margin-top: 10px;
        }
        .sign-box {
            text-align: center;
            width: 200px;
            font-weight: bold;
        }
        .sign-title {
            margin-bottom: 50px;
        }
        .sign-name {
            font-weight: bold;
        }

        @media print {
            @page { margin: 10mm; }
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body onload="window.print()">
    @php
        // Decode JSON payload from DB
        $reportData = json_decode($shipment->qc_report_notes, true);
        $meta = $reportData['meta'] ?? [];
        $issues = $reportData['issues'] ?? [];
        $allIssuesFound = $reportData['all_issues_found'] ?? [];
        
        // Handle fallback if it's stored as plain array/string (older shipments)
        if (!is_array($reportData) || !isset($reportData['meta'])) {
            $allIssuesFound = [];
            if (is_array($reportData)) {
                $allIssuesFound = $reportData;
            } else if (is_string($reportData)) {
                $allIssuesFound = [$reportData];
            }
        }

        $checklist = [
            [
                'category' => 'Identitas Produk',
                'items' => [
                    'Label produk sesuai dengan spesifikasi',
                    'Lebar produk sesuai dengan spesifikasi',
                    'Diameter produk sesuai dengan spesifikasi',
                    'Thickness, Plybond sesuai dengan spesifikasi'
                ]
            ],
            [
                'category' => 'Kondisi Fisik Roll',
                'items' => [
                    'Tidak cembung/cekung berlebihan',
                    'Roll tidak sobek',
                    'Roll tidak terdapat lipatan mati',
                    'Roll tidak basah/lembab',
                    'Roll tidak ada kontaminasi (debu, sawang, dll)'
                ]
            ],
            [
                'category' => 'Packing & Proteksi',
                'items' => [
                    'Wrapping dalam kondisi bagus',
                    'Core tidak rusak/penyok',
                    'Strap/pallet/pengganjal dalam kondisi tidak rusak',
                    'Penataan Roll diatas kendaraan tidak saling menekan'
                ]
            ],
            [
                'category' => 'Proses Loading',
                'items' => [
                    'Penggunaan forklift clam untuk produk roll',
                    'Penggunaan forklift garpu untuk produk slitting',
                    'Arah roll sesuai dengan standar (vertical)'
                ]
            ],
            [
                'category' => 'Dokumen',
                'items' => [
                    'Roll yang dimuat sesuai dengan weight list'
                ]
            ]
        ];
    @endphp

    <div class="header">
        <div class="header-left">
            <div class="logo-placeholder">IRP</div>
        </div>
        <div class="header-center">
            <h2>PT INDONESIA ROYAL PAPER</h2>
            <h3>Checklist Inspeksi QC Loading</h3>
        </div>
        <div class="header-right">
            <table>
                <tr><td>Doc. No</td><td>: IRP-QCO-FR-011</td></tr>
                <tr><td>Rev</td><td>: 0</td></tr>
                <tr><td>Issued Date</td><td>: 12.02.2022</td></tr>
                <tr><td>Page</td><td>: 1</td></tr>
            </table>
        </div>
    </div>

    <div class="meta-info">
        <div class="meta-col">
            <div class="meta-row">
                <div class="meta-label">Customer</div>
                <div class="meta-value">: {{ $meta['customer'] ?? ($shipment->customers->pluck('customer')->join(', ') ?: '') }}</div>
            </div>
            <div class="meta-row">
                <div class="meta-label">Jenis Kendaraan</div>
                <div class="meta-value">: {{ $meta['jenis_kendaraan'] ?? '' }}</div>
            </div>
            <div class="meta-row">
                <div class="meta-label">No Kendaraan</div>
                <div class="meta-value">: {{ $meta['no_kendaraan'] ?? '' }}</div>
            </div>
        </div>
        <div class="meta-col">
            <div class="meta-row">
                <div class="meta-label">WL Number</div>
                <div class="meta-value">: {{ $shipment->shipment_number }}</div>
            </div>
            <div class="meta-row">
                <div class="meta-label">Tanggal</div>
                <div class="meta-value">: {{ isset($meta['tanggal']) ? \Carbon\Carbon::parse($meta['tanggal'])->format('d/m/Y') : \Carbon\Carbon::parse($shipment->shipment_date)->format('d/m/Y') }}</div>
            </div>
            <div class="meta-row">
                <div class="meta-label">Tujuan</div>
                <div class="meta-value">: {{ $meta['tujuan'] ?? '' }}</div>
            </div>
        </div>
    </div>

    <table class="checklist-table">
        <thead>
            <tr>
                <th>No</th>
                <th style="text-align: left;">Item Check</th>
                <th>OK</th>
                <th>Not OK</th>
                <th style="text-align: left;">Remark</th>
            </tr>
        </thead>
        <tbody>
            @foreach($checklist as $cIdx => $cat)
                <tr class="category-row">
                    <td class="text-center">{{ $cIdx + 1 }}</td>
                    <td colspan="4">{{ $cat['category'] }}</td>
                </tr>
                @foreach($cat['items'] as $iIdx => $item)
                    @php 
                        $isNotOk = in_array($item, $allIssuesFound);
                    @endphp
                    <tr class="{{ $isNotOk ? 'not-ok-row' : '' }}">
                        <td class="text-center"></td>
                        <td>{{ chr(97 + $iIdx) }}. {{ $item }}</td>
                        <td class="text-center check-mark">{{ !$isNotOk ? '✓' : '' }}</td>
                        <td class="text-center check-mark" style="color: red;">{{ $isNotOk ? '✓' : '' }}</td>
                        <td>{{ $isNotOk ? ($issues[$item] ?? '') : '' }}</td>
                    </tr>
                @endforeach
            @endforeach
        </tbody>
    </table>

    <div class="footer-note">
        Note: {{ $issues['General Note'] ?? '' }}
    </div>

    <div class="signatures">
        <div class="sign-box">
            <div class="sign-title">Inspektor</div>
            <div class="sign-name">( {{ $shipment->qc->username ?? '.......................................' }} )</div>
        </div>
    </div>
</body>
</html>
