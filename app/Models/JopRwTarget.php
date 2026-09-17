<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JopRwTarget extends Model
{
    protected $fillable = [
        'jop_id',
        'rolls_width_id',
        'qty',
    ];

    public function jop()
    {
        return $this->belongsTo(Jop::class, 'jop_id');
    }

    public function rollsWidth()
    {
        return $this->belongsTo(RollsWidth::class, 'rolls_width_id');
    }
}
