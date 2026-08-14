<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Plybond extends Model
{
    protected $guarded = [];

    public function rolls()
    {
        return $this->hasMany(Roll::class, 'plybonds_id');
    }
}
