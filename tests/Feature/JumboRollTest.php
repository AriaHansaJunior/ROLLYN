<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Grade;
use App\Models\Gsm;
use App\Models\Jop;
use App\Models\JumboRoll;
use App\Models\Roll;
use App\Models\Shift;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JumboRollTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $production;
    protected User $ppic;
    protected User $qc;
    protected Jop $jop;
    protected Shift $shift;
    protected Grade $grade;
    protected Gsm $gsm;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'username' => 'admin_user',
            'email'    => 'admin@test.com',
            'password' => bcrypt('password123'),
            'role'     => 'admin',
        ]);

        $this->production = User::create([
            'username' => 'prod_user',
            'email'    => 'prod@test.com',
            'password' => bcrypt('password123'),
            'role'     => 'production',
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

        $customer = Customer::create(['customer' => 'PT Test Customer']);
        $this->grade = Grade::create(['grade' => 'KLB-150']);
        $this->gsm = Gsm::create(['gsm' => 150]);
        $this->shift = Shift::create(['shift' => '1']);

        $this->jop = Jop::create([
            'jop'          => 'JOP-2026-001',
            'spk'          => 'SPK-2026-001',
            'po'           => 'PO-2026-001',
            'customers_id' => $customer->id,
            'grades_id'    => $this->grade->id,
            'gsms_id'      => $this->gsm->id,
            'weight'       => 20000,
            'quantity'     => 10,
        ]);
    }

    public function test_unauthenticated_user_cannot_access_jumbo_roll(): void
    {
        $response = $this->get('/jumbo-roll');
        $response->assertRedirect('/login');
    }

    public function test_admin_and_production_and_ppic_can_access_jumbo_roll(): void
    {
        // Admin
        $resAdmin = $this->actingAs($this->admin)->get('/jumbo-roll');
        $resAdmin->assertStatus(200);
        $resAdmin->assertInertia(fn ($page) => $page->component('JumboRoll'));

        // Production
        $resProd = $this->actingAs($this->production)->get('/jumbo-roll');
        $resProd->assertStatus(200);
        $resProd->assertInertia(fn ($page) => $page->component('JumboRoll'));

        // PPIC
        $resPpic = $this->actingAs($this->ppic)->get('/jumbo-roll');
        $resPpic->assertStatus(200);
        $resPpic->assertInertia(fn ($page) => $page->component('JumboRoll'));
    }

    public function test_unauthorized_role_cannot_access_jumbo_roll(): void
    {
        $resQc = $this->actingAs($this->qc)->get('/jumbo-roll');
        $resQc->assertStatus(403);
    }

    public function test_create_jumbo_roll_successfully(): void
    {
        $this->actingAs($this->admin);

        $payload = [
            'jumbo_roll_number' => 'JR-001',
            'jops_id'           => $this->jop->id,
            'weight'            => 18500,
            'production_date'   => '2026-09-28',
            'status'            => 'IN_PROGRESS',
            'notes'             => 'Initial test jumbo roll',
        ];

        $response = $this->postJson('/jumbo-roll', $payload);
        $response->assertStatus(201);
        $response->assertJson([
            'status'  => 'success',
            'message' => "Jumbo Roll 'JR-001' created successfully.",
        ]);

        $this->assertDatabaseHas('jumbo_rolls', [
            'jumbo_roll_number' => 'JR-001',
            'jops_id'           => $this->jop->id,
            'weight'            => 18500.00,
            'production_date'   => '2026-09-28',
            'status'            => 'IN_PROGRESS',
        ]);

        $jumbo = JumboRoll::where('jumbo_roll_number', 'JR-001')->first();
        $this->assertNotNull($jumbo);
        $this->assertEquals('JOP-2026-001', $jumbo->jop->jop);
    }

    public function test_validation_prevents_duplicate_jumbo_roll_number(): void
    {
        $this->actingAs($this->admin);

        JumboRoll::create([
            'jumbo_roll_number' => 'JR-001',
            'jops_id'           => $this->jop->id,
            'weight'            => 18000,
            'production_date'   => '2026-09-28',
        ]);

        $payload = [
            'jumbo_roll_number' => 'JR-001',
            'jops_id'           => $this->jop->id,
            'weight'            => 19000,
            'production_date'   => '2026-09-28',
        ];

        $response = $this->postJson('/jumbo-roll', $payload);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['jumbo_roll_number']);
    }

    public function test_validation_prevents_invalid_weight_or_missing_fields(): void
    {
        $this->actingAs($this->admin);

        $response = $this->postJson('/jumbo-roll', [
            'jumbo_roll_number' => '',
            'jops_id'           => 999999, // non-existent JOP
            'weight'            => -50,    // invalid weight
            'production_date'   => 'not-a-date',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['jumbo_roll_number', 'jops_id', 'weight', 'production_date']);
    }

    public function test_update_jumbo_roll(): void
    {
        $this->actingAs($this->admin);

        $jumbo = JumboRoll::create([
            'jumbo_roll_number' => 'JR-002',
            'jops_id'           => $this->jop->id,
            'weight'            => 17500,
            'production_date'   => '2026-09-27',
            'status'            => 'IN_PROGRESS',
        ]);

        $response = $this->putJson("/jumbo-roll/{$jumbo->id}", [
            'jumbo_roll_number' => 'JR-002',
            'jops_id'           => $this->jop->id,
            'weight'            => 18000,
            'production_date'   => '2026-09-28',
            'status'            => 'COMPLETED',
            'notes'             => 'Cutting completed',
        ]);

        $response->assertStatus(200);
        $response->assertJson(['status' => 'success']);

        $this->assertDatabaseHas('jumbo_rolls', [
            'id'     => $jumbo->id,
            'weight' => 18000.00,
            'status' => 'COMPLETED',
            'notes'  => 'Cutting completed',
        ]);
    }

    public function test_relationship_one_jumbo_roll_has_many_incoming_rolls(): void
    {
        $this->actingAs($this->admin);

        $jumbo = JumboRoll::create([
            'jumbo_roll_number' => 'JR-REL-01',
            'jops_id'           => $this->jop->id,
            'weight'            => 18000,
            'production_date'   => '2026-09-28',
        ]);

        // Create 4 incoming rolls originating from this Jumbo Roll
        $roll1 = Roll::create([
            'no'            => 1001,
            'no_roll'       => 'ROLL-1001',
            'form'          => 1,
            'shifts_id'     => $this->shift->id,
            'grades_id'     => $this->grade->id,
            'gsms_id'       => $this->gsm->id,
            'jops_id'       => $this->jop->id,
            'jumbo_roll_id' => $jumbo->id,
            'weight'        => 4500,
            'entry_date'    => '2026-09-28',
        ]);

        $roll2 = Roll::create([
            'no'            => 1002,
            'no_roll'       => 'ROLL-1002',
            'form'          => 1,
            'shifts_id'     => $this->shift->id,
            'grades_id'     => $this->grade->id,
            'gsms_id'       => $this->gsm->id,
            'jops_id'       => $this->jop->id,
            'jumbo_roll_id' => $jumbo->id,
            'weight'        => 4500,
            'entry_date'    => '2026-09-28',
        ]);

        $roll3 = Roll::create([
            'no'            => 1003,
            'no_roll'       => 'ROLL-1003',
            'form'          => 1,
            'shifts_id'     => $this->shift->id,
            'grades_id'     => $this->grade->id,
            'gsms_id'       => $this->gsm->id,
            'jops_id'       => $this->jop->id,
            'jumbo_roll_id' => $jumbo->id,
            'weight'        => 4400,
            'entry_date'    => '2026-09-28',
        ]);

        $roll4 = Roll::create([
            'no'            => 1004,
            'no_roll'       => 'ROLL-1004',
            'form'          => 1,
            'shifts_id'     => $this->shift->id,
            'grades_id'     => $this->grade->id,
            'gsms_id'       => $this->gsm->id,
            'jops_id'       => $this->jop->id,
            'jumbo_roll_id' => $jumbo->id,
            'weight'        => 4400,
            'entry_date'    => '2026-09-28',
        ]);

        // 1. Verify Jumbo Roll has 4 incoming rolls
        $this->assertEquals(4, $jumbo->rolls()->count());
        $this->assertEquals(4, $jumbo->rolls_count);
        $this->assertEquals(17800.0, $jumbo->total_cut_weight);
        $this->assertEquals(200.0, $jumbo->remaining_weight);
        $this->assertEquals(98.89, $jumbo->yield_percentage);

        // 2. Verify each incoming roll identifies its source Jumbo Roll
        $this->assertEquals('JR-REL-01', $roll1->fresh()->jumboRoll->jumbo_roll_number);
        $this->assertEquals('JR-REL-01', $roll2->fresh()->jumboRoll->jumbo_roll_number);
        $this->assertEquals('JR-REL-01', $roll3->fresh()->jumboRoll->jumbo_roll_number);
        $this->assertEquals('JR-REL-01', $roll4->fresh()->jumboRoll->jumbo_roll_number);

        // 3. Verify show endpoint returns all 4 rolls
        $detailRes = $this->getJson("/jumbo-roll/{$jumbo->id}");
        $detailRes->assertStatus(200);
        $detailRes->assertJson([
            'jumbo_roll_number' => 'JR-REL-01',
            'rolls_count'       => 4,
            'total_cut_weight'  => 17800.0,
        ]);
        $this->assertCount(4, $detailRes->json('rolls'));
    }

    public function test_existing_incoming_rolls_without_jumbo_roll_remain_valid(): void
    {
        // Create an incoming roll without jumbo roll
        $independentRoll = Roll::create([
            'no'            => 2001,
            'no_roll'       => 'ROLL-INDEP-01',
            'shifts_id'     => $this->shift->id,
            'grades_id'     => $this->grade->id,
            'gsms_id'       => $this->gsm->id,
            'jops_id'       => $this->jop->id,
            'jumbo_roll_id' => null,
            'weight'        => 1200,
            'entry_date'    => '2026-09-28',
        ]);

        $this->assertNull($independentRoll->jumbo_roll_id);
        $this->assertNull($independentRoll->jumboRoll);
    }

    public function test_delete_safety_blocks_deletion_when_associated_rolls_exist(): void
    {
        $this->actingAs($this->admin);

        $jumbo = JumboRoll::create([
            'jumbo_roll_number' => 'JR-DELETE-SAFE',
            'jops_id'           => $this->jop->id,
            'weight'            => 19000,
            'production_date'   => '2026-09-28',
        ]);

        $roll = Roll::create([
            'no'            => 3001,
            'no_roll'       => 'ROLL-3001',
            'shifts_id'     => $this->shift->id,
            'grades_id'     => $this->grade->id,
            'gsms_id'       => $this->gsm->id,
            'jops_id'       => $this->jop->id,
            'jumbo_roll_id' => $jumbo->id,
            'weight'        => 4800,
            'entry_date'    => '2026-09-28',
        ]);

        // Attempt to delete jumbo roll with associated roll
        $response = $this->deleteJson("/jumbo-roll/{$jumbo->id}");
        $response->assertStatus(422);
        $response->assertJson([
            'status' => 'error',
        ]);
        $this->assertStringContainsString('Cannot delete Jumbo Roll', $response->json('message'));

        // Verify data is preserved
        $this->assertDatabaseHas('jumbo_rolls', ['id' => $jumbo->id]);
        $this->assertDatabaseHas('rolls', ['no' => 3001]);
    }

    public function test_can_delete_jumbo_roll_after_unassigning_rolls(): void
    {
        $this->actingAs($this->admin);

        $jumbo = JumboRoll::create([
            'jumbo_roll_number' => 'JR-UNLINK-DELETE',
            'jops_id'           => $this->jop->id,
            'weight'            => 19000,
            'production_date'   => '2026-09-28',
        ]);

        $roll = Roll::create([
            'no'            => 4001,
            'no_roll'       => 'ROLL-4001',
            'shifts_id'     => $this->shift->id,
            'grades_id'     => $this->grade->id,
            'gsms_id'       => $this->gsm->id,
            'jops_id'       => $this->jop->id,
            'jumbo_roll_id' => $jumbo->id,
            'weight'        => 4800,
            'entry_date'    => '2026-09-28',
        ]);

        // Unlink roll
        $unlinkRes = $this->deleteJson("/jumbo-roll/{$jumbo->id}/rolls/{$roll->no}");
        $unlinkRes->assertStatus(200);
        $this->assertNull($roll->fresh()->jumbo_roll_id);

        // Now deletion succeeds
        $deleteRes = $this->deleteJson("/jumbo-roll/{$jumbo->id}");
        $deleteRes->assertStatus(200);
        $deleteRes->assertJson(['status' => 'success']);

        $this->assertDatabaseMissing('jumbo_rolls', ['id' => $jumbo->id]);
        // Incoming roll remains safe in inventory!
        $this->assertDatabaseHas('rolls', ['no' => 4001]);
    }

    public function test_assign_existing_incoming_rolls_to_jumbo_roll(): void
    {
        $this->actingAs($this->admin);

        $jumbo = JumboRoll::create([
            'jumbo_roll_number' => 'JR-ASSIGN-01',
            'jops_id'           => $this->jop->id,
            'weight'            => 18000,
            'production_date'   => '2026-09-28',
        ]);

        $rollA = Roll::create([
            'no'         => 5001,
            'no_roll'    => 'ROLL-5001',
            'shifts_id'  => $this->shift->id,
            'grades_id'  => $this->grade->id,
            'gsms_id'    => $this->gsm->id,
            'jops_id'    => $this->jop->id,
            'weight'     => 4500,
            'entry_date' => '2026-09-28',
        ]);

        $rollB = Roll::create([
            'no'         => 5002,
            'no_roll'    => 'ROLL-5002',
            'shifts_id'  => $this->shift->id,
            'grades_id'  => $this->grade->id,
            'gsms_id'    => $this->gsm->id,
            'jops_id'    => $this->jop->id,
            'weight'     => 4500,
            'entry_date' => '2026-09-28',
        ]);

        $response = $this->postJson("/jumbo-roll/{$jumbo->id}/assign-rolls", [
            'roll_ids' => [$rollA->no, $rollB->no],
        ]);

        $response->assertStatus(200);
        $response->assertJson(['status' => 'success']);

        $this->assertEquals($jumbo->id, $rollA->fresh()->jumbo_roll_id);
        $this->assertEquals($jumbo->id, $rollB->fresh()->jumbo_roll_id);
    }

    public function test_incoming_roll_creation_via_controller_with_jumbo_roll(): void
    {
        $this->actingAs($this->production);

        $jumbo = JumboRoll::create([
            'jumbo_roll_number' => 'JR-SOURCE-TEST',
            'jops_id'           => $this->jop->id,
            'weight'            => 19500,
            'production_date'   => '2026-09-28',
        ]);

        $response = $this->postJson('/incoming-roll', [
            'rollNumber'    => 'ROLL-NEW-99',
            'jop'           => $this->jop->jop,
            'grade'         => 'KLB-150',
            'gsm'           => '150',
            'shift'         => '1',
            'weight'        => 4800,
            'visual'        => 'OK',
            'status'        => 'OK',
            'jumbo_roll_id' => $jumbo->id,
        ]);

        $response->assertStatus(201);

        $roll = Roll::where('no_roll', 'ROLL-NEW-99')->first();
        $this->assertNotNull($roll);
        $this->assertEquals($jumbo->id, $roll->jumbo_roll_id);
        $this->assertEquals('JR-SOURCE-TEST', $roll->jumboRoll->jumbo_roll_number);
    }

    public function test_recommend_jumbo_roll_endpoint_returns_existing_active_jumbo_roll(): void
    {
        $this->actingAs($this->production);

        $jumbo = JumboRoll::create([
            'jumbo_roll_number' => 'JR-2026-ACTIVE',
            'jops_id'           => $this->jop->id,
            'weight'            => 19000,
            'production_date'   => '2026-09-28',
            'status'            => 'IN_PROGRESS',
        ]);

        $response = $this->getJson("/incoming-roll/recommend-jumbo?jop=" . urlencode($this->jop->jop));
        $response->assertStatus(200);
        $response->assertJson([
            'jumbo_roll'    => 'JR-2026-ACTIVE',
            'jumbo_roll_id' => $jumbo->id,
            'status'        => 'IN_PROGRESS',
        ]);
        $this->assertCount(1, $response->json('existing_rolls'));
    }

    public function test_recommend_jumbo_roll_endpoint_derives_standard_number_when_none_exists(): void
    {
        $this->actingAs($this->production);

        $response = $this->getJson("/incoming-roll/recommend-jumbo?jop=" . urlencode($this->jop->jop));
        $response->assertStatus(200);
        $response->assertJson([
            'jumbo_roll'    => 'JR-2026-001',
            'jumbo_roll_id' => null,
        ]);
    }

    public function test_incoming_roll_auto_creates_and_links_jumbo_roll_when_string_provided(): void
    {
        $this->actingAs($this->production);

        $response = $this->postJson('/incoming-roll', [
            'rollNumber' => 'ROLL-AUTO-JR-01',
            'jop'        => $this->jop->jop,
            'grade'      => 'KLB-150',
            'gsm'        => '150',
            'shift'      => '1',
            'weight'     => 4500,
            'visual'     => 'OK',
            'status'     => 'OK',
            'jumbo_roll' => 'JR-AUTO-GENERATED-01',
        ]);

        $response->assertStatus(201);

        $createdJumbo = JumboRoll::where('jumbo_roll_number', 'JR-AUTO-GENERATED-01')->first();
        $this->assertNotNull($createdJumbo);
        $this->assertEquals($this->jop->id, $createdJumbo->jops_id);

        $roll = Roll::where('no_roll', 'ROLL-AUTO-JR-01')->first();
        $this->assertNotNull($roll);
        $this->assertEquals($createdJumbo->id, $roll->jumbo_roll_id);
    }
}
