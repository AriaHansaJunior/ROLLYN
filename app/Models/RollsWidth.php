<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RollsWidth extends Model
{
    protected $fillable = ['width'];

    public function jops()
    {
        return $this->hasMany(Jop::class, 'rolls_widths_id');
    }
}
