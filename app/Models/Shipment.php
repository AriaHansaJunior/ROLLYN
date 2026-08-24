<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shipment extends Model
{
    protected $guarded = [];

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customers_id');
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
