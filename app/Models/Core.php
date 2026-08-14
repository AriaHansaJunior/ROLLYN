<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Core extends Model
{
    protected $guarded = [];

    public function rolls()
    {
        return $this->hasMany(Roll::class, 'cores_id');
    }
}
