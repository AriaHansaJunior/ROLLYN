<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Location;
use Illuminate\Foundation\Testing\RefreshDatabase;

class SpectrumTripleCheckingProtocolTest extends TestCase
{
    use RefreshDatabase;

    public function test_triple_checking_protocol_artisan_command_passes(): void
    {
        // Seed physical locations
        Location::create(['location' => 'E17-1-1', 'status' => 0]);
        Location::create(['location' => 'E17-1-2', 'status' => 0]);
        Location::create(['location' => 'A17-1-1', 'status' => 0]);

        $this->artisan('spectrum:triple-check --count=50')
            ->assertExitCode(0);
    }
}

