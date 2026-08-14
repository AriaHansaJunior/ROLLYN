<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    protected $guarded = [];

    public function jops()
    {
        return $this->hasMany(Jop::class, 'customers_id');
    }
}
