<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Location extends Model
{
    protected $guarded = [];

    public function rolls()
    {
        return $this->hasMany(Roll::class, 'locations_id');
    }
}
