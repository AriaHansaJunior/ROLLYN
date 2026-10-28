<?php

namespace Tests\Feature;

use App\Models\Grade;
use App\Models\Location;
use App\Models\Roll;
use App\Models\Shift;
use App\Models\Shipment;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Database\Eloquent\MassAssignmentException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Shift::create(['shift' => 'A']);
        Grade::create(['grade' => 'Kraft']);
    }

    /**
     * Pillar 1: CSRF Protection
     */
    public function test_ai_spectrum_routes_require_csrf_token(): void
    {
        $middleware = new class($this->app, $this->app['encrypter']) extends \Illuminate\Foundation\Http\Middleware\PreventRequestForgery {
            protected function runningUnitTests()
            {
                return false;
            }
        };

        $request = \Illuminate\Http\Request::create('/api/spectrum/detect', 'POST');
        $session = $this->app['session']->driver();
        $session->setId('test-session');
        $session->start();
        $session->put('_token', 'valid-session-token');
        $request->setLaravelSession($session);

        // 1. Without CSRF token -> must throw TokenMismatchException (CSRF Protection Active)
        $failed = false;
        try {
            $middleware->handle($request, function () {
                return response('OK');
            });
        } catch (\Illuminate\Session\TokenMismatchException $e) {
            $failed = true;
        }

        $this->assertTrue($failed, 'Expected CSRF verification to reject request without CSRF token.');

        // 2. With valid CSRF token -> Must pass successfully
        $request->headers->set('X-CSRF-TOKEN', 'valid-session-token');
        $response = $middleware->handle($request, function () {
            return response('OK');
        });

        $this->assertEquals(200, $response->getStatusCode());
    }

    /**
     * Pillar 2: Mass Assignment Prevention
     */
    public function test_mass_assignment_protection_on_models(): void
    {
        $roll = new Roll();
        $fillable = $roll->getFillable();

        $this->assertNotEmpty($fillable);
        $this->assertContains('no_roll', $fillable);
        $this->assertContains('shifts_id', $fillable);
        $this->assertContains('grades_id', $fillable);
        $this->assertNotContains('is_admin_override', $fillable);
        $this->assertNotContains('malicious_payload', $fillable);

        // Verify that setting unfillable attributes triggers MassAssignmentException under strict mode
        $this->expectException(MassAssignmentException::class);
        Roll::create([
            'no' => 9999,
            'no_roll' => 'TEST-01',
            'unfillable_backdoor_field' => 'hacked',
        ]);
    }

    /**
     * Pillar 3: Security Headers
     */
    public function test_security_headers_are_present(): void
    {
        $response = $this->get('/login');

        $response->assertHeader('X-Frame-Options', 'SAMEORIGIN');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-XSS-Protection', '1; mode=block');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->assertHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');

        $csp = $response->headers->get('Content-Security-Policy');
        $this->assertNotNull($csp);
        $this->assertStringContainsString("frame-ancestors 'self'", $csp);
        $this->assertStringContainsString("default-src 'self'", $csp);
    }

    /**
     * Pillar 4: Policy-Based Authorization & Ownership
     */
    public function test_roll_policy_enforces_ownership_on_updates(): void
    {
        $owner = User::factory()->create(['role' => 'production']);
        $otherUser = User::factory()->create(['role' => 'production']);
        $admin = User::factory()->create(['role' => 'admin']);

        $roll = Roll::create([
            'no' => 101,
            'no_roll' => 'ROLL-OWNER-01',
            'shifts_id' => 1,
            'grades_id' => 1,
            'users_id' => $owner->id,
            'entry_date' => now()->toDateString(),
        ]);

        // 1. Owner can update
        $this->assertTrue(Gate::forUser($owner)->allows('update', $roll));

        // 2. Unrelated user cannot update someone else's roll
        $this->assertFalse(Gate::forUser($otherUser)->allows('update', $roll));

        // 3. Admin can update
        $this->assertTrue(Gate::forUser($admin)->allows('update', $roll));
    }

    public function test_shipment_policy_enforces_qc_assignment(): void
    {
        $assignedQc = User::factory()->create(['role' => 'qc']);
        $otherQc = User::factory()->create(['role' => 'qc']);
        $admin = User::factory()->create(['role' => 'admin']);
        $ppic = User::factory()->create(['role' => 'ppic']);
        $customer = Customer::create(['customer' => 'Customer A']);

        $shipment = Shipment::create([
            'shipment_number' => 'SHP-2026-001',
            'admin_users_id' => $ppic->id,
            'qc_users_id' => $assignedQc->id,
            'status' => 'pending',
            'shipment_date' => now()->toDateString(),
        ]);
        $shipment->customers()->attach($customer->id);

        // 1. Assigned QC officer can process
        $this->assertTrue(Gate::forUser($assignedQc)->allows('qcProcess', $shipment));

        // 2. Other QC officer cannot process this shipment
        $this->assertFalse(Gate::forUser($otherQc)->allows('qcProcess', $shipment));

        // 3. Admin can process
        $this->assertTrue(Gate::forUser($admin)->allows('qcProcess', $shipment));

        // 4. PPIC creator can cancel
        $this->assertTrue(Gate::forUser($ppic)->allows('cancel', $shipment));

        // 5. Another PPIC officer can also cancel (shift handover)
        $anotherPpic = User::factory()->create(['role' => 'ppic']);
        $this->assertTrue(Gate::forUser($anotherPpic)->allows('cancel', $shipment));

        // 6. Random QC cannot cancel
        $this->assertFalse(Gate::forUser($otherQc)->allows('cancel', $shipment));
    }

    public function test_root_route_redirects_by_role(): void
    {
        // 1. Guest -> /login
        $this->get('/')->assertRedirect('/login');

        // 2. Production -> /incoming-roll
        $prod = User::factory()->create(['role' => 'production']);
        $this->actingAs($prod)->get('/')->assertRedirect('/incoming-roll');

        // 3. QC -> /roll-inventory
        $qc = User::factory()->create(['role' => 'qc']);
        $this->actingAs($qc)->get('/')->assertRedirect('/roll-inventory');

        // 4. PPIC -> /dashboard
        $ppic = User::factory()->create(['role' => 'ppic']);
        $this->actingAs($ppic)->get('/')->assertRedirect('/dashboard');

        // 5. Admin -> /dashboard
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin)->get('/')->assertRedirect('/dashboard');
    }

    public function test_user_policy_blocks_admin_self_deletion(): void
    {
        $adminA = User::factory()->create(['role' => 'admin']);
        $adminB = User::factory()->create(['role' => 'admin']);

        // Admin cannot delete own account
        $this->assertFalse(Gate::forUser($adminA)->allows('delete', $adminA));

        // Admin can delete other account
        $this->assertTrue(Gate::forUser($adminA)->allows('delete', $adminB));
    }

    public function test_roll_policy_prevents_deleting_roll_in_active_shipment_even_for_admin(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $ppic = User::factory()->create(['role' => 'ppic']);
        $qc = User::factory()->create(['role' => 'qc']);

        $roll = Roll::create([
            'no' => 201,
            'no_roll' => 'ROLL-SHIP-01',
            'shifts_id' => 1,
            'grades_id' => 1,
            'users_id' => $ppic->id,
            'entry_date' => now()->toDateString(),
        ]);

        $shipment = Shipment::create([
            'shipment_number' => 'SHP-ACT-001',
            'admin_users_id' => $ppic->id,
            'qc_users_id' => $qc->id,
            'status' => 'pending',
            'shipment_date' => now()->toDateString(),
        ]);

        \App\Models\ShipmentRoll::create([
            'shipment_id' => $shipment->id,
            'roll_no' => $roll->no,
            'qc_status' => 'pending',
        ]);

        // Neither admin nor PPIC nor creator can delete roll while in active shipment
        $this->assertFalse(Gate::forUser($admin)->allows('delete', $roll));
        $this->assertFalse(Gate::forUser($ppic)->allows('delete', $roll));

        // Once shipment is canceled, admin and PPIC can delete it
        $shipment->update(['status' => 'canceled']);
        $this->assertTrue(Gate::forUser($admin)->allows('delete', $roll));
        $this->assertTrue(Gate::forUser($ppic)->allows('delete', $roll));
    }
}
