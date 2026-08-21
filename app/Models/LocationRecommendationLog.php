<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LocationRecommendationLog extends Model
{
    use HasFactory;

    protected $table = 'location_recommendation_logs';

    protected $fillable = [
        'rolls_no',
        'no_roll',
        'users_id',
        'action_type',
        'previous_locations_id',
        'recommended_locations_id',
        'selected_locations_id',
        'is_match',
        'notes',
    ];

    protected $casts = [
        'is_match' => 'boolean',
    ];

    public function roll()
    {
        return $this->belongsTo(Roll::class, 'rolls_no', 'no');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'users_id');
    }

    public function previousLocation()
    {
        return $this->belongsTo(Location::class, 'previous_locations_id');
    }

    public function recommendedLocation()
    {
        return $this->belongsTo(Location::class, 'recommended_locations_id');
    }

    public function selectedLocation()
    {
        return $this->belongsTo(Location::class, 'selected_locations_id');
    }
}
