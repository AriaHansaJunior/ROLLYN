<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Grade extends Model
{
    protected $fillable = ['grade'];

    public function jops()
    {
        return $this->hasMany(Jop::class, 'grades_id');
    }

    public function rolls()
    {
        return $this->hasMany(Roll::class, 'grades_id');
    }
}
