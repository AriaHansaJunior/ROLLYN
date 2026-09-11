<?php

namespace Tests\Feature;

use App\Http\Controllers\IncomingRollController;
use App\Models\User;
use App\Models\Roll;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IncomingRollAutoIncrementTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->user = User::first() ?? User::create([
            'username' => 'admin_test',
            'email'    => 'admin@test.com',
            'password' => bcrypt('secret123'),
            'role'     => 'admin',
        ]);
    }

    public function test_get_next_roll_number_calculation(): void
    {
        $this->assertEquals('2001', IncomingRollController::getNextRollNumber('2000'));
        $this->assertEquals('2002', IncomingRollController::getNextRollNumber('2001'));
        $this->assertEquals('2010', IncomingRollController::getNextRollNumber('2009'));
        $this->assertEquals('3002', IncomingRollController::getNextRollNumber('3001'));
        $this->assertEquals('3003', IncomingRollController::getNextRollNumber('3002'));
        $this->assertEquals('R-10426', IncomingRollController::getNextRollNumber('R-10425'));
        $this->assertEquals('0010', IncomingRollController::getNextRollNumber('0009'));
        $this->assertNull(IncomingRollController::getNextRollNumber(''));
        $this->assertNull(IncomingRollController::getNextRollNumber(null));
    }

    public function test_full_acceptance_scenario(): void
    {
        $this->actingAs($this->user);

        // STEP 1: Save Roll Number: 2000 -> Expected next recommendation: 2001
        $res1 = $this->postJson('/incoming-roll', [
            'rollNumber' => '2000',
            'grade'      => 'KLB-150',
            'gsm'        => '150',
            'shift'      => '1',
            'visual'     => 'OK',
            'status'     => 'OK',
            'entry_date' => date('Y-m-d'),
        ]);
        $res1->assertStatus(201);
        $res1->assertJson([
            'status' => 'success',
            'last_saved_roll_number' => '2000',
            'recommended_roll_number' => '2001',
        ]);
        $this->assertEquals('2000', session('last_saved_roll_number'));

        // STEP 2: Save 2001 -> Expected next recommendation: 2002
        $res2 = $this->postJson('/incoming-roll', [
            'rollNumber' => '2001',
            'grade'      => 'KLB-150',
            'gsm'        => '150',
            'shift'      => '1',
            'visual'     => 'OK',
            'status'     => 'OK',
            'entry_date' => date('Y-m-d'),
        ]);
        $res2->assertStatus(201);
        $res2->assertJson([
            'status' => 'success',
            'last_saved_roll_number' => '2001',
            'recommended_roll_number' => '2002',
        ]);
        $this->assertEquals('2001', session('last_saved_roll_number'));

        // STEP 3: Save 2002 -> Expected: 2003, continue through 2009 -> Expected: 2010
        for ($i = 2002; $i <= 2009; $i++) {
            $expectedNext = strval($i + 1);
            $res = $this->postJson('/incoming-roll', [
                'rollNumber' => strval($i),
                'grade'      => 'KLB-150',
                'gsm'        => '150',
                'shift'      => '1',
                'visual'     => 'OK',
                'status'     => 'OK',
                'entry_date' => date('Y-m-d'),
            ]);
            $res->assertStatus(201);
            $res->assertJson([
                'status' => 'success',
                'last_saved_roll_number' => strval($i),
                'recommended_roll_number' => $expectedNext,
            ]);
            $this->assertEquals(strval($i), session('last_saved_roll_number'));
        }

        // Verify session currently has 2009, recommended is 2010
        $this->assertEquals('2009', session('last_saved_roll_number'));

        // STEP 4: Manually change Roll Number to 3001, successfully save it -> Expected next recommendation: 3002
        $resManual = $this->postJson('/incoming-roll', [
            'rollNumber' => '3001',
            'grade'      => 'KLB-150',
            'gsm'        => '150',
            'shift'      => '1',
            'visual'     => 'OK',
            'status'     => 'OK',
            'entry_date' => date('Y-m-d'),
        ]);
        $resManual->assertStatus(201);
        $resManual->assertJson([
            'status' => 'success',
            'last_saved_roll_number' => '3001',
            'recommended_roll_number' => '3002',
        ]);
        $this->assertEquals('3001', session('last_saved_roll_number'));

        // STEP 5: Save 3002 -> Expected: 3003
        $res3002 = $this->postJson('/incoming-roll', [
            'rollNumber' => '3002',
            'grade'      => 'KLB-150',
            'gsm'        => '150',
            'shift'      => '1',
            'visual'     => 'OK',
            'status'     => 'OK',
            'entry_date' => date('Y-m-d'),
        ]);
        $res3002->assertStatus(201);
        $res3002->assertJson([
            'status' => 'success',
            'last_saved_roll_number' => '3002',
            'recommended_roll_number' => '3003',
        ]);
        $this->assertEquals('3002', session('last_saved_roll_number'));

        // STEP 6: Refresh/reopen page -> Expected: 3003 (NOT 2010)
        $pageResponse = $this->get('/incoming-roll');
        $pageResponse->assertStatus(200);
        $pageResponse->assertInertia(fn ($page) => $page
            ->component('IncomingRoll')
            ->where('lastSavedRollNumber', '3002')
            ->where('recommendedRollNumber', '3003')
        );

        // Verification endpoint check
        $recResponse = $this->getJson('/incoming-roll/recommended-roll-number');
        $recResponse->assertStatus(200);
        $recResponse->assertJson([
            'last_saved_roll_number' => '3002',
            'recommended_roll_number' => '3003',
        ]);

        // Verify that refreshing the page did NOT increment the session
        $this->assertEquals('3002', session('last_saved_roll_number'));
    }

    public function test_failed_submission_does_not_update_session_baseline(): void
    {
        $this->actingAs($this->user);

        // Establish baseline: 2000
        $this->postJson('/incoming-roll', [
            'rollNumber' => '2000',
            'grade'      => 'KLB-150',
            'gsm'        => '150',
            'shift'      => '1',
            'visual'     => 'OK',
            'status'     => 'OK',
            'entry_date' => date('Y-m-d'),
        ])->assertStatus(201);

        $this->assertEquals('2000', session('last_saved_roll_number'));

        // Attempt duplicate roll number (2000) -> should fail
        $duplicateRes = $this->postJson('/incoming-roll', [
            'rollNumber' => '2000',
            'grade'      => 'KLB-150',
            'gsm'        => '150',
            'shift'      => '1',
            'visual'     => 'OK',
            'status'     => 'OK',
            'entry_date' => date('Y-m-d'),
        ]);
        $duplicateRes->assertStatus(422);

        // Session MUST remain 2000 (Section 5)
        $this->assertEquals('2000', session('last_saved_roll_number'));

        // Attempt invalid request (e.g. empty roll number) -> should fail validation
        $invalidRes = $this->postJson('/incoming-roll', [
            'rollNumber' => '',
        ]);
        $invalidRes->assertStatus(422);

        // Session MUST still remain 2000
        $this->assertEquals('2000', session('last_saved_roll_number'));
    }
}
