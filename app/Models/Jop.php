<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Jop extends Model
{
    protected $guarded = [];

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customers_id');
    }

    public function grade()
    {
        return $this->belongsTo(Grade::class, 'grades_id');
    }

    public function gsm()
    {
        return $this->belongsTo(Gsm::class, 'gsms_id');
    }

    public function rollsWidth()
    {
        return $this->belongsTo(RollsWidth::class, 'rolls_widths_id');
    }

    public function rolls()
    {
        return $this->hasMany(Roll::class, 'jops_id');
    }
}
