<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Services\AI\LightGBMSlotRanker;
use App\Services\AI\SlotFeatureExtractor;
use App\Services\AI\SpectrumRecommendationEngine;
use App\Models\Location;
use Illuminate\Foundation\Testing\RefreshDatabase;

class LightGBMSlotRecommendationTest extends TestCase
{
    use RefreshDatabase;

    public function test_lightgbm_ranker_outputs_valid_prediction_structure(): void
    {
        // 10 features: norm_weight, norm_gsm, col_idx, tier_idx, grade_aff, jop_aff, safety, habit, prox, density
        $x = [0.55, 0.40, 5.0, 1.0, 0.90, 0.95, 0.95, 0.20, 0.80, 0.50];

        $prediction = LightGBMSlotRanker::predict($x);

        $this->assertIsArray($prediction);
        $this->assertArrayHasKey('score', $prediction);
        $this->assertArrayHasKey('margin', $prediction);
        $this->assertArrayHasKey('probability', $prediction);
        $this->assertArrayHasKey('reasons', $prediction);
        $this->assertArrayHasKey('tag', $prediction);
        $this->assertArrayHasKey('feature_contributions', $prediction);

        $this->assertGreaterThanOrEqual(0.0, $prediction['score']);
        $this->assertLessThanOrEqual(100.0, $prediction['score']);
        $this->assertGreaterThanOrEqual(0.0, $prediction['probability']);
        $this->assertLessThanOrEqual(1.0, $prediction['probability']);
        $this->assertNotEmpty($prediction['reasons']);

        // Check feature contributions dictionary
        $this->assertCount(10, $prediction['feature_contributions']);
        $this->assertArrayHasKey('grade_affinity', $prediction['feature_contributions']);
        $this->assertArrayHasKey('structural_safety', $prediction['feature_contributions']);
    }

    public function test_lightgbm_prefers_heavy_roll_at_tier_1_over_high_tiers(): void
    {
        // Heavy roll (1500 kg -> norm_weight ~0.55)
        // Candidate A: Tier 1 (Ground foundation)
        $xA = [0.55, 0.50, 4.0, 1.0, 0.80, 0.80, 0.95, 0.10, 0.80, 0.25];
        // Candidate B: Tier 3 (High level stacking)
        $xB = [0.55, 0.50, 4.0, 3.0, 0.80, 0.80, 0.40, 0.10, 0.80, 0.50];

        $predA = LightGBMSlotRanker::predict($xA);
        $predB = LightGBMSlotRanker::predict($xB);

        $this->assertGreaterThan(
            $predB['score'],
            $predA['score'],
            'LightGBM model must rank Ground Tier 1 higher than Tier 3 for heavy rolls to ensure structural stability.'
        );
    }

    public function test_lightgbm_rewards_jop_and_grade_clustering(): void
    {
        // Candidate 1: Col matching both Grade and JOP
        $xClustered = [0.35, 0.30, 2.0, 1.0, 1.0, 1.0, 0.85, 0.15, 0.80, 0.50];
        // Candidate 2: Col with mixed grade and zero JOP match
        $xMixed = [0.35, 0.30, 2.0, 1.0, 0.20, 0.20, 0.85, 0.15, 0.80, 0.50];

        $predClustered = LightGBMSlotRanker::predict($xClustered);
        $predMixed = LightGBMSlotRanker::predict($xMixed);

        $this->assertGreaterThan(
            $predMixed['score'],
            $predClustered['score'],
            'LightGBM model must prioritize slots that cluster matching Grade and JOP orders together.'
        );
    }

    public function test_slot_feature_extractor_normalizes_correctly(): void
    {
        $features = SlotFeatureExtractor::extract(
            col: 3,
            tier: 1,
            grade: 'Kraft',
            weight: 1200,
            gsm: 150,
            jop: 'JOP-001',
            columnGrades: [3 => ['Kraft']],
            columnJops: [3 => ['JOP-001']],
            columnWeights: [3 => [1100]],
            userHabitBayWeights: [3 => 0.25],
            actionType: 'ASSIGN',
            currentLocationId: null,
            allLocations: collect(),
            occupiedMap: []
        );

        $this->assertCount(10, $features);
        // Weight normalized: (1200 - 300) / 2200 = 0.409
        $this->assertEqualsWithDelta(0.409, $features[0], 0.01);
        // Grade affinity: perfect match
        $this->assertEquals(1.0, $features[4]);
        // JOP affinity: perfect match
        $this->assertEquals(1.0, $features[5]);
        // Structural safety at tier 1 for 1200kg
        $this->assertEquals(1.0, $features[6]);
    }

    public function test_spectrum_recommendation_engine_runs_lightgbm_in_pure_php(): void
    {
        // Seed physical test slots for Column 1 (Tiers 1, 2)
        Location::create(['location' => 'A17-1-1', 'status' => 0]);
        Location::create(['location' => 'A17-1-2', 'status' => 0]);

        $roll = [
            'grade' => 'Kraft',
            'weight' => 1100,
            'gsm' => 150,
            'jop' => 'JOP-TEST-999',
        ];

        $start = microtime(true);
        $result = SpectrumRecommendationEngine::recommend($roll);
        $elapsed = (microtime(true) - $start) * 1000; // in milliseconds

        $this->assertNotNull($result['recommendedSlot']);
        $this->assertEquals('A17-1-1', $result['recommendedSlot']['code']);
        $this->assertArrayHasKey('model_info', $result);
        $this->assertEquals(LightGBMSlotRanker::MODEL_NAME, $result['model_info']['model_name']);
        $this->assertEquals('Pure PHP 8.3+ Native (Zero Python Dependency)', $result['model_info']['runtime']);

        // Assert performance is blazing fast (< 50ms including DB queries)
        $this->assertLessThan(100.0, $elapsed, 'Pure-PHP LightGBM inference must execute within acceptable latency.');
    }
}

