<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JumboRoll extends Model
{
    protected $fillable = [
        'jumbo_roll_number',
        'jops_id',
        'weight',
        'production_date',
        'status',
        'notes',
        'users_id',
    ];

    protected $casts = [
        'production_date' => 'date:Y-m-d',
        'weight' => 'decimal:2',
    ];

    protected $appends = [
        'rolls_count',
        'total_cut_weight',
        'remaining_weight',
        'yield_percentage',
    ];

    public function jop()
    {
        return $this->belongsTo(Jop::class, 'jops_id');
    }

    public function rolls()
    {
        return $this->hasMany(Roll::class, 'jumbo_roll_id', 'id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'users_id');
    }

    public function getRollsCountAttribute(): int
    {
        return $this->relationLoaded('rolls')
            ? $this->rolls->count()
            : $this->rolls()->count();
    }

    public function getTotalCutWeightAttribute(): float
    {
        return $this->relationLoaded('rolls')
            ? (float) $this->rolls->sum('weight')
            : (float) $this->rolls()->sum('weight');
    }

    public function getRemainingWeightAttribute(): float
    {
        $weight = (float) $this->weight;
        $cutWeight = $this->total_cut_weight;
        return max(0, round($weight - $cutWeight, 2));
    }

    public function getYieldPercentageAttribute(): float
    {
        $weight = (float) $this->weight;
        if ($weight <= 0) {
            return 0;
        }
        return round(($this->total_cut_weight / $weight) * 100, 2);
    }
}
