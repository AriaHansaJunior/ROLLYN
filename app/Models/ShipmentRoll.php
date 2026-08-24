<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShipmentRoll extends Model
{
    protected $guarded = [];

    public function shipment()
    {
        return $this->belongsTo(Shipment::class, 'shipment_id');
    }

    public function roll()
    {
        return $this->belongsTo(Roll::class, 'roll_no', 'no');
    }
}
