<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Gsm extends Model
{
    protected $guarded = [];

    public function jops()
    {
        return $this->hasMany(Jop::class, 'gsms_id');
    }
}
