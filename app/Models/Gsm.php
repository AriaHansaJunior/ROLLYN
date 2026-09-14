<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Gsm extends Model
{
    protected $fillable = ['gsm'];

    public function jops()
    {
        return $this->hasMany(Jop::class, 'gsms_id');
    }
}
