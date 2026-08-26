<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Roll extends Model
{
    protected $primaryKey = 'no';
    public $incrementing = false;
    protected $keyType = 'int';
    protected $guarded = [];

    public function shift()
    {
        return $this->belongsTo(Shift::class, 'shifts_id');
    }

    public function grade()
    {
        return $this->belongsTo(Grade::class, 'grades_id');
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

    public function cobb()
    {
        return $this->belongsTo(Cobb::class, 'cobbs_id');
    }

    public function location()
    {
        return $this->belongsTo(Location::class, 'locations_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'users_id');
    }

    public function jop()
    {
        return $this->belongsTo(Jop::class, 'jops_id');
    }

    public function locationRecommendationLogs()
    {
        return $this->hasMany(LocationRecommendationLog::class, 'rolls_no', 'no');
    }

    public function shipmentRolls()
    {
        return $this->hasMany(ShipmentRoll::class, 'roll_no', 'no');
    }
}
