<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WEIGHT LIST - {{ $shipment->shipment_number }}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 15mm;
        }
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 0;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 5px;
            border-bottom: 2px solid #000;
            padding-bottom: 5px;
        }
        .header-left {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .logo-placeholder {
            width: 50px;
            height: 50px;
            border: 1px solid #000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            color: #000;
            text-align: center;
        }
        .company-info h1 {
            margin: 0 0 5px 0;
            font-size: 18px;
            font-weight: bold;
            color: #1a4a8d; /* Approximating the blue logo text */
        }
        .company-info p {
            margin: 2px 0;
            font-size: 10px;
        }
        .header-right {
            text-align: right;
        }
        .header-right h2 {
            margin: 0;
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 2px;
        }
        .header-right .doc-number {
            font-size: 20px;
            font-weight: bold;
            margin-top: 5px;
        }
        
        .sub-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-weight: bold;
            font-size: 13px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th, td {
            border: 1px solid #000;
            padding: 4px 6px;
            text-align: center;
            font-size: 11px;
        }
        th {
            font-weight: bold;
            background-color: #f9f9f9;
        }
        
        /* Specific column widths to match image loosely */
        th:nth-child(1) { width: 4%; }
        th:nth-child(2) { width: 8%; }
        th:nth-child(3) { width: 22%; }
        th:nth-child(4) { width: 6%; }
        th:nth-child(5) { width: 10%; }
        th:nth-child(6) { width: 10%; }
        th:nth-child(7) { width: 12%; }
        th:nth-child(8) { width: 18%; }
        th:nth-child(9) { width: 10%; }
        
        .totals-row td {
            font-weight: bold;
            border-top: 2px solid #000;
        }

        .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
        }
        .signatures .sign-box {
            text-align: center;
            width: 200px;
        }
        .signatures .sign-box-left {
            display: flex;
            gap: 50px;
        }
        .signatures .sign-box-left div {
            text-align: center;
            width: 100px;
        }
        .sign-line {
            border-bottom: 1px solid #000;
            margin-top: 60px;
            width: 100%;
        }
        .date-text {
            margin-bottom: 5px;
        }
        
        @media print {
            @page {
                margin: 10mm;
            }
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body onload="window.print()">

    @php
        $customers = $shipment->customers->pluck('customer')->join(', ') ?: '-';
        $rolls = $shipment->shipmentRolls;
        $totalWeight = $rolls->sum(function($sr) {
            return $sr->roll->weight ?? 0;
        });
    @endphp

    <div class="header">
        <div class="header-left">
            <!-- You can replace this placeholder with an actual <img> tag when you have the logo -->
            <div class="logo-placeholder">LOGO</div>
            <div class="company-info">
                <h1 style="color: #000;">PT INDONESIA ROYAL PAPER</h1>
                <p>Office &nbsp;&nbsp;&nbsp;: Dsn Plumpang Wetan, Daditunggal, Ploso, Kab. Jombang</p>
                <p>Factory : Dsn Plumpang Wetan, Daditunggal, Ploso, Kab. Jombang</p>
                <p>Phone &nbsp;&nbsp; : -</p>
            </div>
        </div>
        <div class="header-right">
            <h2>WEIGHT LIST</h2>
            <div class="doc-number">{{ $shipment->id }}</div>
        </div>
    </div>

    <div class="sub-header">
        <div>Container No : 0 (0)</div>
        <div>Cust : {{ $customers }}</div>
    </div>

    <table>
        <thead>
            <tr>
                <th>No.</th>
                <th>Grade</th>
                <th>Lot No</th>
                <th>GSM</th>
                <th>Roll<br>Width</th>
                <th>Roll<br>Diameter</th>
                <th>Net Weight<br>(Kgs)</th>
                <th>JOP</th>
                <th>FG Loc</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rolls as $index => $sr)
                @php $r = $sr->roll; @endphp
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ $r->grade->grade ?? '-' }}</td>
                    <td>{{ $r->no_roll ?? $r->id }}</td>
                    <td>{{ $r->gsm->gsm ?? '-' }}</td>
                    <td>{{ $r->rollsWidth->width ?? '-' }}</td>
                    <td>{{ $r->rollsDiameter->diameter ?? '-' }}</td>
                    <td>{{ $r->weight ?? 0 }}</td>
                    <td>{{ $r->jop->jop ?? '-' }}</td>
                    <td>{{ $r->location->location ?? '-' }}</td>
                </tr>
            @endforeach
            
            <!-- Fill empty rows to make it look like a full page form if desired (optional) -->
            @for($i = count($rolls) + 1; $i <= max(count($rolls), 26); $i++)
                <tr>
                    <td>{{ $i }}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
            @endfor
            
            <tr class="totals-row">
                <td colspan="3" style="text-align: right; border-right: none;">Total Roll</td>
                <td colspan="3" style="text-align: left; border-left: none; padding-left: 10px;">{{ count($rolls) }}</td>
                <td>{{ number_format($totalWeight, 0, ',', '.') }} Kgm</td>
                <td colspan="2"></td>
            </tr>
        </tbody>
    </table>

    <div class="signatures">
        <div class="sign-box-left">
            <div>
                <div style="font-weight: bold;">QC</div>
                <div class="sign-line"></div>
            </div>
            <div>
                <div style="font-weight: bold;">FG</div>
                <div class="sign-line"></div>
            </div>
        </div>
        
        <div class="sign-box">
            <div class="date-text">Jombang, {{ \Carbon\Carbon::parse($shipment->shipment_date)->format('d F Y') }}</div>
            <div style="font-weight: bold;">PT. INDONESIA ROYAL PAPER</div>
            <div class="sign-line" style="margin-top: 50px;"></div>
        </div>
    </div>

</body>
</html>
