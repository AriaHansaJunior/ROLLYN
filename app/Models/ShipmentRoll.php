<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShipmentRoll extends Model
{
    protected $fillable = [
        'shipment_id',
        'roll_no',
        'qc_status',
        'qc_notes',
        'qc_checked_at',
    ];

    public function shipment()
    {
        return $this->belongsTo(Shipment::class, 'shipment_id');
    }

    public function roll()
    {
        return $this->belongsTo(Roll::class, 'roll_no', 'no');
    }
}
