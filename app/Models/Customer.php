<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    protected $fillable = ['customer'];

    public function jops()
    {
        return $this->hasMany(Jop::class, 'customers_id');
    }
}
