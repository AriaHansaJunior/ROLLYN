<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Jop extends Model
{
    protected $guarded = [];

    protected $appends = ['production_estimation'];

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customers_id');
    }

    public function grade()
    {
        return $this->belongsTo(Grade::class, 'grades_id');
    }

    public function gsm()
    {
        return $this->belongsTo(Gsm::class, 'gsms_id');
    }

    public function rollsWidth()
    {
        return $this->belongsTo(RollsWidth::class, 'rolls_widths_id');
    }

    public function plybond()
    {
        return $this->belongsTo(Plybond::class, 'plybonds_id');
    }

    public function thickness()
    {
        return $this->belongsTo(Thickness::class, 'thicknesses_id');
    }

    public function core()
    {
        return $this->belongsTo(Core::class, 'cores_id');
    }

    public function rolls()
    {
        return $this->hasMany(Roll::class, 'jops_id');
    }

    public function productionSchedules()
    {
        return $this->hasMany(ProductionSchedule::class, 'jops_id');
    }

    public function getProductionEstimationAttribute()
    {
        $scheduleTonnage = $this->relationLoaded('productionSchedules') 
            ? (float) $this->productionSchedules->sum('tonnage')
            : (float) $this->productionSchedules()->sum('tonnage');

        $targetTonnage = $scheduleTonnage > 0 
            ? $scheduleTonnage 
            : ($this->weight ? round($this->weight / 1000, 2) : 0);

        $actualWeightKg = $this->relationLoaded('rolls')
            ? (float) $this->rolls->sum('weight')
            : (float) $this->rolls()->sum('weight');

        $actualTonnage = round($actualWeightKg / 1000, 2);

        $remainingTonnage = max(0, round($targetTonnage - $actualTonnage, 2));

        $tph = $this->tph !== null ? (float) $this->tph : null;
        if ($tph === null && $this->relationLoaded('productionSchedules')) {
            $lastSched = $this->productionSchedules->last();
            $tph = $lastSched ? (float) $lastSched->tph : null;
        } elseif ($tph === null) {
            $lastSched = $this->productionSchedules()->latest('id')->first();
            $tph = $lastSched ? (float) $lastSched->tph : null;
        }

        $totalHours = $this->relationLoaded('productionSchedules')
            ? (int) $this->productionSchedules->sum('production_hours')
            : (int) $this->productionSchedules()->sum('production_hours');

        if ($totalHours <= 0 && $targetTonnage > 0 && $tph > 0) {
            $totalHours = (int) ceil($targetTonnage / $tph);
        }

        $latestStop = $this->relationLoaded('productionSchedules')
            ? $this->productionSchedules->max('stop_time')
            : $this->productionSchedules()->max('stop_time');

        $estFinishFormatted = $latestStop ? Carbon::parse($latestStop)->format('d/m/Y H:i') : 'N/A';

        $rollsCount = $this->relationLoaded('rolls') ? $this->rolls->count() : $this->rolls()->count();
        if ($targetTonnage > 0) {
            $isCompleted = ($remainingTonnage <= 0);
        } else {
            $isCompleted = ($this->quantity > 0 && $rollsCount >= $this->quantity && $actualTonnage > 0);
        }

        return [
            'target_tonnage' => $targetTonnage > 0 ? number_format($targetTonnage, 2, '.', '') : '-',
            'actual_tonnage' => number_format($actualTonnage, 2, '.', ''),
            'remaining_tonnage' => $targetTonnage > 0 ? number_format($remainingTonnage, 2, '.', '') : '-',
            'tph' => $tph !== null ? (string)$tph : '-',
            'estimated_duration_hours' => $totalHours,
            'estimated_duration_formatted' => $totalHours > 0 ? "{$totalHours}h" : 'N/A',
            'estimated_finish_time' => $estFinishFormatted,
            'cop_gsm_change_estimate' => 'N/A',
            'is_completed' => $isCompleted,
        ];
    }
}
