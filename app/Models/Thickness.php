<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Thickness extends Model
{
    protected $fillable = ['thickness'];

    public function rolls()
    {
        return $this->hasMany(Roll::class, 'thicknesses_id');
    }
}
