<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shipment extends Model
{
    protected $fillable = [
        'shipment_number',

        'admin_users_id',
        'qc_users_id',
        'status',
        'shipment_date',
        'qc_report_notes',
    ];

    public function customers()
    {
        return $this->belongsToMany(Customer::class);
    }

    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_users_id');
    }

    public function qc()
    {
        return $this->belongsTo(User::class, 'qc_users_id');
    }

    public function shipmentRolls()
    {
        return $this->hasMany(ShipmentRoll::class, 'shipment_id');
    }
}
