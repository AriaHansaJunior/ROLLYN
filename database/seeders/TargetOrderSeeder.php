<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Customer;
use App\Models\Grade;
use App\Models\Gsm;
use App\Models\RollsWidth;
use App\Models\Jop;

class TargetOrderSeeder extends Seeder
{
    public function run()
    {
        $orders = [
            [
                'jop' => 'JOP-0726-00001', 'spk' => 'SPK-0726-101', 'po' => 'PO-CUST-001',
                'customer' => 'PT. Kemas Indah Nusantara', 'grade' => 'GRADE - XX', 'gsm' => 500.0, 'width' => 1120.0,
                'quantity' => 2, 'weight' => 2087.0, 'container' => 'CONT-A01', 'status' => 'In Progress'
            ],
            [
                'jop' => 'JOP-0726-00001', 'spk' => 'SPK-0726-102', 'po' => 'PO-CUST-002',
                'customer' => 'PT. Mega Box Perkasa', 'grade' => 'SPECTA - LY3', 'gsm' => 500.0, 'width' => 1120.0,
                'quantity' => 166, 'weight' => 168862.0, 'container' => 'CONT-A02', 'status' => 'In Progress'
            ],
            [
                'jop' => 'JOP-0726-00002', 'spk' => 'SPK-0726-103', 'po' => 'PO-CUST-003',
                'customer' => 'CV. Jaya Logistik', 'grade' => 'GRADE - XX', 'gsm' => 420.0, 'width' => 1133.0,
                'quantity' => 21, 'weight' => 23112.0, 'container' => 'CONT-B01', 'status' => 'Pending'
            ],
            [
                'jop' => 'JOP-0726-00002', 'spk' => 'SPK-0726-104', 'po' => 'PO-CUST-004',
                'customer' => 'PT. Cipta Kertas Mandiri', 'grade' => 'SPECTA - TK4', 'gsm' => 420.0, 'width' => 1133.0,
                'quantity' => 2547, 'weight' => 2803488.0, 'container' => 'CONT-B02', 'status' => 'In Progress'
            ],
            [
                'jop' => 'JOP-0726-00003', 'spk' => 'SPK-0726-105', 'po' => 'PO-CUST-005',
                'customer' => 'PT. Kemas Indah Nusantara', 'grade' => 'GRADE - XX', 'gsm' => 360.0, 'width' => 1133.0,
                'quantity' => 1, 'weight' => 1123.0, 'container' => 'CONT-C01', 'status' => 'Completed'
            ],
            [
                'jop' => 'JOP-0726-00003', 'spk' => 'SPK-0726-106', 'po' => 'PO-CUST-006',
                'customer' => 'PT. Lintas Benua Pack', 'grade' => 'SPECTA - TK4', 'gsm' => 360.0, 'width' => 1133.0,
                'quantity' => 603, 'weight' => 668038.0, 'container' => 'CONT-C02', 'status' => 'In Progress'
            ],
            [
                'jop' => 'JOP-0726-00004', 'spk' => 'SPK-0726-107', 'po' => 'PO-CUST-007',
                'customer' => 'CV. Mulia Kertas', 'grade' => 'GRADE - XX', 'gsm' => 360.0, 'width' => 1133.0,
                'quantity' => 8, 'weight' => 8750.0, 'container' => 'CONT-D01', 'status' => 'Pending'
            ],
            [
                'jop' => 'JOP-0726-00004', 'spk' => 'SPK-0726-108', 'po' => 'PO-CUST-008',
                'customer' => 'PT. Mega Box Perkasa', 'grade' => 'SPECTA - LY4', 'gsm' => 360.0, 'width' => 1133.0,
                'quantity' => 40, 'weight' => 42808.0, 'container' => 'CONT-D02', 'status' => 'In Progress'
            ],
            [
                'jop' => 'JOP-0726-00005', 'spk' => 'SPK-0726-109', 'po' => 'PO-CUST-009',
                'customer' => 'PT. Cipta Kertas Mandiri', 'grade' => 'GRADE - XX', 'gsm' => 395.0, 'width' => 1110.0,
                'quantity' => 2, 'weight' => 2034.0, 'container' => 'CONT-E01', 'status' => 'Completed'
            ],
            [
                'jop' => 'JOP-0726-00005', 'spk' => 'SPK-0726-110', 'po' => 'PO-CUST-010',
                'customer' => 'PT. Cipta Kertas Mandiri', 'grade' => 'REJECT PRODUCT', 'gsm' => 395.0, 'width' => 1110.0,
                'quantity' => 1, 'weight' => 1013.0, 'container' => 'CONT-E02', 'status' => 'Hold'
            ]
        ];

        DB::beginTransaction();
        try {
            foreach ($orders as $order) {
                // Ensure the keys map perfectly to actual column names
                $customerData = Customer::firstOrCreate(['customer' => $order['customer']]);
                $gradeData = Grade::firstOrCreate(['grade' => $order['grade']]);
                $gsmData = Gsm::firstOrCreate(['gsm' => $order['gsm']]);
                $widthData = RollsWidth::firstOrCreate(['width' => $order['width']]);

                // 'container' is integer in migration. Convert string CONT-A01 to int.
                $containerInt = (int) preg_replace('/[^0-9]/', '', $order['container']);

                Jop::updateOrCreate(
                    ['spk' => $order['spk']], 
                    [
                        'jop' => $order['jop'],
                        'po' => $order['po'],
                        'customers_id' => $customerData->id,
                        'grades_id' => $gradeData->id,
                        'gsms_id' => $gsmData->id,
                        'rolls_widths_id' => $widthData->id,
                        'quantity' => $order['quantity'],
                        'weight' => $order['weight'],
                        'container' => $containerInt,
                        'noted_order' => "Status: " . $order['status'] . " | Container: " . $order['container']
                    ]
                );
            }
            DB::commit();
            $this->command->info('Target Order Seeder berhasil dijalankan!');
        } catch (\Exception $e) {
            DB::rollBack();
            $this->command->error('Error Seeder: ' . $e->getMessage());
        }
    }
}
