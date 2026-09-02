<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RollAuditLog extends Model
{
    protected $guarded = [];

    public function roll()
    {
        return $this->belongsTo(Roll::class, 'rolls_no', 'no');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'users_id');
    }
