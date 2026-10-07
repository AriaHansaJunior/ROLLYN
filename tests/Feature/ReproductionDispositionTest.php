<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Grade;
use App\Models\Gsm;
use App\Models\Jop;
use App\Models\Roll;
use App\Models\Shipment;
use App\Models\ShipmentRoll;
use App\Models\Shift;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReproductionDispositionTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $ppic;
    protected User $qc;
    protected User $production;
    protected Roll $roll;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'username' => 'admin_user',
            'email'    => 'admin@test.com',
            'password' => bcrypt('password123'),
            'role'     => 'admin',
        ]);

        $this->ppic = User::create([
            'username' => 'ppic_user',
            'email'    => 'ppic@test.com',
            'password' => bcrypt('password123'),
            'role'     => 'ppic',
        ]);

        $this->qc = User::create([
            'username' => 'qc_user',
            'email'    => 'qc@test.com',
            'password' => bcrypt('password123'),
            'role'     => 'qc',
        ]);

        $this->production = User::create([
            'username' => 'prod_user',
            'email'    => 'prod@test.com',
            'password' => bcrypt('password123'),
            'role'     => 'production',
        ]);

        $shift = Shift::create(['shift' => '1']);
        $grade = Grade::create(['grade' => 'KRAFT']);
        $gsm = Gsm::create(['gsm' => 150]);
        $customer = Customer::create(['customer' => 'PT Test Customer']);
        $jop = Jop::create([
            'jop' => 'JOP-0726-00010',
            'spk' => 'SPK-2026-001',
            'po' => 'PO-2026-001',
            'weight' => 20000,
            'quantity' => 10,
            'customers_id' => $customer->id,
            'grades_id' => $grade->id,
            'gsms_id' => $gsm->id,
        ]);

        $this->roll = Roll::create([
            'no' => 101,
            'no_roll' => 'R-2607-001',
            'shifts_id' => $shift->id,
            'grades_id' => $grade->id,
            'weight' => 1250,
            'jops_id' => $jop->id,
            'users_id' => $this->production->id,
            'status' => 'OK',
            'visual' => 'OK',
            'exmaterial' => 'LOCAL',
        ]);
    }

    public function test_ppic_can_set_reproduction_disposition(): void
    {
        $response = $this->actingAs($this->ppic)->post("/rolls/{$this->roll->no}/reproduction-disposition", [
            'reproduction_status' => 'reproduce_again',
            'notes' => 'Please remelt and re-cut',
        ]);

        $response->assertRedirect();
        $this->roll->refresh();
        $this->assertEquals('reproduce_again', $this->roll->reproduction_status);
    }

    public function test_admin_can_set_reproduction_disposition(): void
    {
        $response = $this->actingAs($this->admin)->post("/rolls/{$this->roll->no}/reproduction-disposition", [
            'reproduction_status' => 'reweigh',
        ]);

        $response->assertRedirect();
        $this->roll->refresh();
        $this->assertEquals('reweigh', $this->roll->reproduction_status);
    }

    public function test_non_ppic_users_are_forbidden_from_reproduction_disposition_route(): void
    {
        $response = $this->actingAs($this->production)->post("/rolls/{$this->roll->no}/reproduction-disposition", [
            'reproduction_status' => 'shipped',
        ]);

        $response->assertStatus(403);
    }

    public function test_setting_shipped_disposition_syncs_to_shipment_roll(): void
    {
        $shipment = Shipment::create([
            'shipment_number' => 'SHP-2026-0001',
            'admin_users_id' => $this->admin->id,
            'qc_users_id' => $this->qc->id,
            'shipment_date' => now(),
            'status' => 'pending',
        ]);

        $shipmentRoll = ShipmentRoll::create([
            'shipment_id' => $shipment->id,
            'roll_no' => $this->roll->no,
            'qc_status' => 'rejected_replace',
            'qc_notes' => 'Damaged surface during staging',
        ]);

        $response = $this->actingAs($this->ppic)->post("/rolls/{$this->roll->no}/reproduction-disposition", [
            'reproduction_status' => 'shipped',
        ]);

        $response->assertRedirect();
        $this->roll->refresh();
        $shipmentRoll->refresh();

        $this->assertEquals('shipped', $this->roll->reproduction_status);
        $this->assertEquals('shipped', $shipmentRoll->reproduction_status);
        $this->assertEquals('passed', $shipmentRoll->qc_status);
        $this->assertStringContainsString('Approved for shipment by PPIC', $shipmentRoll->qc_notes);
    }

    public function test_validation_rejects_invalid_reproduction_status(): void
    {
        $response = $this->actingAs($this->ppic)->post("/rolls/{$this->roll->no}/reproduction-disposition", [
            'reproduction_status' => 'invalid_status_value',
        ]);

        $response->assertSessionHasErrors(['reproduction_status']);
    }
}
