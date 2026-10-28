<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Shipment;
use App\Models\Customer;
use App\Models\Roll;
use App\Models\ShipmentRoll;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ShipmentHistoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed basic users
        $this->admin = User::create([
            'username' => 'admin_test',
            'role' => 'admin',
            'password' => bcrypt('password')
        ]);

        $this->ppic = User::create([
            'username' => 'ppic_test',
            'role' => 'ppic',
            'password' => bcrypt('password')
        ]);

        $this->qc = User::create([
            'username' => 'qc_test',
            'role' => 'qc',
            'password' => bcrypt('password')
        ]);

        $this->operator = User::create([
            'username' => 'operator_test',
            'role' => 'operator',
            'password' => bcrypt('password')
        ]);

        $this->customer = Customer::create([
            'customer' => 'Test Customer'
        ]);
    }

    public function test_admin_access_defaults_to_latest_shipment_date_when_no_date_param(): void
    {
        $shipment1 = Shipment::create([
            'shipment_number' => 'SHP-20260910-001',
            'admin_users_id' => $this->admin->id,
            'qc_users_id' => $this->qc->id,
            'status' => 'completed',
            'shipment_date' => '2026-09-10',
        ]);
        $shipment1->customers()->attach($this->customer->id);

        $shipment2 = Shipment::create([
            'shipment_number' => 'SHP-20261015-002',
            'admin_users_id' => $this->admin->id,
            'qc_users_id' => $this->qc->id,
            'status' => 'completed',
            'shipment_date' => '2026-10-15',
        ]);
        $shipment2->customers()->attach($this->customer->id);

        $response = $this->actingAs($this->admin)->get('/shipment-history');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('ShipmentHistory')
            ->where('selectedDate', '2026-10-15')
            ->has('shipments', 1)
            ->where('shipments.0.shipment_number', 'SHP-20261015-002')
            ->has('shipmentDates', 2)
        );
    }

    public function test_can_query_specific_date_and_status(): void
    {
        $shipment1 = Shipment::create([
            'shipment_number' => 'SHP-20260910-001',
            'admin_users_id' => $this->admin->id,
            'qc_users_id' => $this->qc->id,
            'status' => 'completed',
            'shipment_date' => '2026-09-10',
        ]);
        $shipment1->customers()->attach($this->customer->id);

        $shipment2 = Shipment::create([
            'shipment_number' => 'SHP-20260910-002',
            'admin_users_id' => $this->admin->id,
            'qc_users_id' => $this->qc->id,
            'status' => 'pending',
            'shipment_date' => '2026-09-10',
        ]);
        $shipment2->customers()->attach($this->customer->id);

        // Filter status=completed on 2026-09-10
        $response = $this->actingAs($this->ppic)->get('/shipment-history?date=2026-09-10&status=completed');
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('ShipmentHistory')
            ->where('selectedDate', '2026-09-10')
            ->has('shipments', 1)
            ->where('shipments.0.shipment_number', 'SHP-20260910-001')
        );

        // Filter status=all on 2026-09-10
        $responseAll = $this->actingAs($this->ppic)->get('/shipment-history?date=2026-09-10&status=all');
        $responseAll->assertStatus(200);
        $responseAll->assertInertia(fn ($page) => $page
            ->component('ShipmentHistory')
            ->where('selectedDate', '2026-09-10')
            ->has('shipments', 2)
        );
    }

    public function test_operator_is_forbidden_from_shipment_history(): void
    {
        $response = $this->actingAs($this->operator)->get('/shipment-history');
        $response->assertStatus(403);
    }

    public function test_qc_can_view_shipment_history(): void
    {
        $response = $this->actingAs($this->qc)->get('/shipment-history');
        $response->assertStatus(200);
    }
}
