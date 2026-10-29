<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Grade;
use App\Models\Gsm;
use App\Models\Jop;
use App\Models\Location;
use App\Models\Roll;
use App\Models\Shift;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiV1RollTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Shift $shift;
    protected Grade $grade;
    protected Gsm $gsm;
    protected Location $location;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::create([
            'username' => 'api_operator',
            'email' => 'operator@test.com',
            'password' => bcrypt('password123'),
            'role' => 'admin',
        ]);

        $this->shift = Shift::create(['shift' => '1']);
        $this->grade = Grade::create(['grade' => 'KLB-150']);
        $this->gsm = Gsm::create(['gsm' => 150]);
        $this->location = Location::create(['location' => 'RACK-01-01', 'status' => 0]);

        Sanctum::actingAs($this->user);
    }

    public function test_api_roll_store_syncs_location_and_enforces_capacity()
    {
        // Add 4 rolls to location
        for ($i = 1; $i <= 4; $i++) {
            $resp = $this->postJson('/api/v1/rolls', [
                'no_roll' => "TEST-R-{$i}",
                'shifts_id' => $this->shift->id,
                'entry_date' => now()->toDateString(),
                'grades_id' => $this->grade->id,
                'locations_id' => $this->location->id,
            ]);
            $resp->assertStatus(201);
        }

        // Location should now be slotted (status 2)
        $this->location->refresh();
        $this->assertEquals(2, $this->location->status);

        // Attempting to add 5th roll should fail with 422
        $respFifth = $this->postJson('/api/v1/rolls', [
            'no_roll' => 'TEST-R-5',
            'shifts_id' => $this->shift->id,
            'entry_date' => now()->toDateString(),
            'grades_id' => $this->grade->id,
            'locations_id' => $this->location->id,
        ]);
        $respFifth->assertStatus(422);
    }

    public function test_api_roll_show_and_update_finds_by_no_roll_string()
    {
        $roll = Roll::create([
            'no' => 101,
            'no_roll' => 'ROLL-SPECIAL-101',
            'shifts_id' => $this->shift->id,
            'entry_date' => now()->toDateString(),
            'grades_id' => $this->grade->id,
            'users_id' => $this->user->id,
        ]);

        // Find by no_roll string
        $showResp = $this->getJson('/api/v1/rolls/ROLL-SPECIAL-101');
        $showResp->assertStatus(200)
                 ->assertJsonPath('data.no_roll', 'ROLL-SPECIAL-101');

        // Update by no_roll string
        $updateResp = $this->putJson('/api/v1/rolls/ROLL-SPECIAL-101', [
            'no_roll' => 'ROLL-SPECIAL-101',
            'shifts_id' => $this->shift->id,
            'entry_date' => now()->toDateString(),
            'grades_id' => $this->grade->id,
            'status' => 'HOLD',
        ]);
        $updateResp->assertStatus(200)
                   ->assertJsonPath('data.status', 'HOLD');
    }

    public function test_api_jop_store_handles_custom_inputs_and_rw_targets()
    {
        $resp = $this->postJson('/api/v1/jops', [
            'spk' => 'SPK-AUTO-01',
            'jop' => 'JOP-AUTO-01',
            'po' => 'PO-01',
            'custom_customer' => 'NEW CUSTOMER CORP',
            'custom_grade' => 'KRAFT-SPECIAL',
            'custom_gsm' => 175,
            'custom_plybond' => 200,
            'custom_thickness' => 220,
            'custom_core' => '76mm',
            'rw_targets' => [
                ['width' => 1200, 'quantity' => 10],
                ['width' => 600, 'quantity' => 5],
            ],
        ]);

        $resp->assertStatus(201);
        $this->assertDatabaseHas('customers', ['customer' => 'NEW CUSTOMER CORP']);
        $this->assertDatabaseHas('jops', ['jop' => 'JOP-AUTO-01', 'quantity' => 15]);
        $this->assertDatabaseHas('jop_rw_targets', ['qty' => 10]);
    }
}
