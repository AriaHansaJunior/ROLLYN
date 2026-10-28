<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Grade;
use App\Models\Gsm;
use App\Models\Jop;
use App\Models\Roll;
use App\Models\RollsWidth;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IncomingRollFormNumberTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::first() ?? User::create([
            'username' => 'admin_test',
            'email'    => 'admin@test.com',
            'password' => bcrypt('secret123'),
            'role'     => 'admin',
        ]);
    }

    public function test_recommend_form_number_resets_to_1_for_new_jop(): void
    {
        $this->actingAs($this->user);

        $shift = \App\Models\Shift::create(['shift' => '1']);
        $customer = Customer::create(['customer' => 'CUST-A']);
        $grade = Grade::create(['grade' => 'KLB-150']);
        $gsm = Gsm::create(['gsm' => 150]);

        $jop1 = Jop::create([
            'jop' => 'JOP-001',
            'spk' => 'SPK-001',
            'po' => 'PO-001',
            'customers_id' => $customer->id,
            'grades_id' => $grade->id,
            'gsms_id' => $gsm->id,
        ]);

        $jop2 = Jop::create([
            'jop' => 'JOP-002',
            'spk' => 'SPK-002',
            'po' => 'PO-002',
            'customers_id' => $customer->id,
            'grades_id' => $grade->id,
            'gsms_id' => $gsm->id,
        ]);

        // Create roll with form = 1 in JOP-001
        Roll::create([
            'no' => 1,
            'no_roll' => 'ROLL-001',
            'form' => 1,
            'shifts_id' => $shift->id,
            'jops_id' => $jop1->id,
            'grades_id' => $grade->id,
            'gsms_id' => $gsm->id,
            'entry_date' => '2026-10-28',
            'users_id' => $this->user->id,
        ]);

        // Recommending form for JOP-002 (which has no rolls) should reset to 1
        $response = $this->postJson('/incoming-roll/recommend-form', [
            'jop' => 'JOP-002',
            'grade' => 'KLB-150',
            'width' => 1200,
            'entry_date' => '2026-10-28',
        ]);

        $response->assertStatus(200);
        $response->assertJson(['formNumber' => 1]);
    }

    public function test_different_jop_can_both_use_form_number_1(): void
    {
        $this->actingAs($this->user);

        // Step 1: Save roll for JOP-001 with Form Number 1
        $res1 = $this->postJson('/incoming-roll', [
            'rollNumber' => 'R-1001',
            'formNumber' => '1',
            'jop'        => 'JOP-001',
            'grade'      => 'KLB-150',
            'gsm'        => '150',
            'width'      => 1200,
            'shift'      => '1',
            'entry_date' => '2026-10-28',
        ]);
        $res1->assertStatus(201);

        // Step 2: Save roll for JOP-002 with Form Number 1 (different JOP, reset from 1)
        $res2 = $this->postJson('/incoming-roll', [
            'rollNumber' => 'R-2001',
            'formNumber' => '1',
            'jop'        => 'JOP-002',
            'grade'      => 'SPECTA-420',
            'gsm'        => '420',
            'width'      => 1400,
            'shift'      => '1',
            'entry_date' => '2026-10-28',
        ]);
        $res2->assertStatus(201);

        $roll1 = Roll::where('no_roll', 'R-1001')->first();
        $roll2 = Roll::where('no_roll', 'R-2001')->first();

        $this->assertNotNull($roll1);
        $this->assertNotNull($roll2);
        $this->assertEquals(1, $roll1->form);
        $this->assertEquals(1, $roll2->form);
        $this->assertNotEquals($roll1->jops_id, $roll2->jops_id);
    }

    public function test_same_jop_rejects_conflicting_specifications_for_same_form_number(): void
    {
        $this->actingAs($this->user);

        // Step 1: Save first roll for JOP-001 with Form Number 1
        $res1 = $this->postJson('/incoming-roll', [
            'rollNumber' => 'R-1001',
            'formNumber' => '1',
            'jop'        => 'JOP-001',
            'grade'      => 'KLB-150',
            'gsm'        => '150',
            'width'      => 1200,
            'shift'      => '1',
            'entry_date' => '2026-10-28',
        ]);
        $res1->assertStatus(201);

        // Step 2: Try to save second roll in the SAME JOP with Form 1 but DIFFERENT width
        $res2 = $this->postJson('/incoming-roll', [
            'rollNumber' => 'R-1002',
            'formNumber' => '1',
            'jop'        => 'JOP-001',
            'grade'      => 'KLB-150',
            'gsm'        => '150',
            'width'      => 1400, // Different width
            'shift'      => '1',
            'entry_date' => '2026-10-28',
        ]);
        $res2->assertStatus(422);
        $res2->assertJson(['status' => 'error']);
        $this->assertStringContainsString('different specifications', $res2->json('message'));
    }

    public function test_same_jop_allows_matching_specifications_for_same_form_number(): void
    {
        $this->actingAs($this->user);

        // Step 1: Save first roll for JOP-001 with Form Number 1
        $res1 = $this->postJson('/incoming-roll', [
            'rollNumber' => 'R-1001',
            'formNumber' => '1',
            'jop'        => 'JOP-001',
            'grade'      => 'KLB-150',
            'gsm'        => '150',
            'width'      => 1200,
            'shift'      => '1',
            'entry_date' => '2026-10-28',
        ]);
        $res1->assertStatus(201);

        // Step 2: Save second roll in the SAME JOP with matching specs and Form 1
        $res2 = $this->postJson('/incoming-roll', [
            'rollNumber' => 'R-1002',
            'formNumber' => '1',
            'jop'        => 'JOP-001',
            'grade'      => 'KLB-150',
            'gsm'        => '150',
            'width'      => 1200, // Same width
            'shift'      => '1',
            'entry_date' => '2026-10-28',
        ]);
        $res2->assertStatus(201);
    }

    public function test_updating_existing_roll_does_not_conflict_with_itself(): void
    {
        $this->actingAs($this->user);

        // Save roll with Form 1
        $res1 = $this->postJson('/incoming-roll', [
            'rollNumber' => 'R-1001',
            'formNumber' => '1',
            'jop'        => 'JOP-001',
            'grade'      => 'KLB-150',
            'gsm'        => '150',
            'width'      => 1200,
            'shift'      => '1',
            'entry_date' => '2026-10-28',
        ]);
        $res1->assertStatus(201);

        // Update the same roll with is_update = true
        $res2 = $this->postJson('/incoming-roll', [
            'is_update'  => true,
            'rollNumber' => 'R-1001',
            'formNumber' => '1',
            'jop'        => 'JOP-001',
            'grade'      => 'KLB-150',
            'gsm'        => '150',
            'width'      => 1200,
            'shift'      => '1',
            'entry_date' => '2026-10-28',
        ]);
        $res2->assertStatus(201);
    }
}
