<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Thickness extends Model
{
    protected $guarded = [];

    public function rolls()
    {
        return $this->hasMany(Roll::class, 'thicknesses_id');
    }
}
