<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Location extends Model
{
    protected $guarded = [];

    public function rolls()
    {
        return $this->hasMany(Roll::class, 'locations_id');
    }

    public function syncState()
    {
        $rolls = $this->rolls()->get();
        $count = $rolls->count();

        if ($count === 0) {
            $this->update([
                'status' => 0, // 0 = Free Space (Kosong)
                'stack_count' => null
            ]);
            return;
        }

        // Check if any roll in this slot is part of an active pending shipment plan
        $rollNos = $rolls->pluck('no')->toArray();
        $inPendingShipment = ShipmentRoll::whereIn('roll_no', $rollNos)
            ->where('qc_status', 'pending')
            ->whereHas('shipment', function ($q) {
                $q->where('status', '!=', 'canceled');
            })
            ->exists();

        $stackLabel = $count === 1 ? '✓' : (string)min($count, 4);
        $status = $inPendingShipment ? 3 : 2; // 3 = Shipment Plan (Green), 2 = Slotted

        $this->update([
            'status' => $status,
            'stack_count' => $stackLabel
        ]);
    }
}
