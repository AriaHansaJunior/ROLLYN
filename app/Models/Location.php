<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Location extends Model
{
    public const MAX_CAPACITY = 4;

    protected $fillable = [
        'location',
        'status',
    ];

    public function rolls()
    {
        return $this->hasMany(Roll::class, 'locations_id');
    }

    public function isFull(int|string|null $excludeRollNo = null): bool
    {
        $query = $this->rolls();
        if ($excludeRollNo !== null) {
            $query->where('no', '!=', $excludeRollNo);
        }
        return $query->count() >= self::MAX_CAPACITY;
    }

    public function getRemainingCapacity(int|string|null $excludeRollNo = null): int
    {
        $query = $this->rolls();
        if ($excludeRollNo !== null) {
            $query->where('no', '!=', $excludeRollNo);
        }
        return max(0, self::MAX_CAPACITY - $query->count());
    }

    public function syncState()
    {
        $rolls = $this->rolls()->get();
        $count = $rolls->count();

        if ($count === 0) {
            $this->update([
                'status' => 0, // 0 = Free Space (Kosong)
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
        ]);
    }
}
