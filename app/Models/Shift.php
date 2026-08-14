<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shift extends Model
{
    protected $guarded = [];

    public function rolls()
    {
        return $this->hasMany(Roll::class, 'shifts_id');
    }
}
