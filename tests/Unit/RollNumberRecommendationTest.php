<?php

namespace Tests\Unit;

use App\Http\Controllers\IncomingRollController;
use PHPUnit\Framework\TestCase;

class RollNumberRecommendationTest extends TestCase
{
    public function test_get_next_roll_number_pure_numeric(): void
    {
        $this->assertEquals('2001', IncomingRollController::getNextRollNumber('2000'));
        $this->assertEquals('2002', IncomingRollController::getNextRollNumber('2001'));
        $this->assertEquals('2003', IncomingRollController::getNextRollNumber('2002'));
        $this->assertEquals('2010', IncomingRollController::getNextRollNumber('2009'));
        $this->assertEquals('3002', IncomingRollController::getNextRollNumber('3001'));
        $this->assertEquals('3003', IncomingRollController::getNextRollNumber('3002'));
        $this->assertEquals('1001', IncomingRollController::getNextRollNumber('1000'));
    }

    public function test_get_next_roll_number_with_prefix(): void
    {
        $this->assertEquals('R-10426', IncomingRollController::getNextRollNumber('R-10425'));
        $this->assertEquals('ROLL-99', IncomingRollController::getNextRollNumber('ROLL-98'));
        $this->assertEquals('ABC_010', IncomingRollController::getNextRollNumber('ABC_009'));
    }

    public function test_get_next_roll_number_empty_or_invalid(): void
    {
        $this->assertNull(IncomingRollController::getNextRollNumber(''));
        $this->assertNull(IncomingRollController::getNextRollNumber('   '));
        $this->assertNull(IncomingRollController::getNextRollNumber(null));
        $this->assertNull(IncomingRollController::getNextRollNumber('NONUMBER'));
    }
}
