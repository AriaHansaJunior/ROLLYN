<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductionSchedule extends Model
{
    protected $guarded = [];

    protected $casts = [
        'start_time' => 'datetime',
        'stop_time'  => 'datetime',
        'tonnage'    => 'float',
        'tph'        => 'float',
    ];

    public function jop()
    {
        return $this->belongsTo(Jop::class, 'jops_id');
    }
}
