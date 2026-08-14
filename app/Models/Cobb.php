<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cobb extends Model
{
    protected $guarded = [];

    public function rolls()
    {
        return $this->hasMany(Roll::class, 'cobbs_id');
    }
}
