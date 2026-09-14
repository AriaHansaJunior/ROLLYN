<?php

namespace App\Policies;

use App\Models\Shipment;
use App\Models\User;

class ShipmentPolicy
{
    /**
     * Super-admin bypass: admins can perform any shipment action.
     */
    public function before(User $user, string $ability): ?bool
    {
        if (strtolower($user->role) === 'admin') {
            return true;
        }

        return null;
    }

    /**
     * Determine whether the user can view any shipments.
     */
    public function viewAny(User $user): bool
    {
        return in_array(strtolower($user->role), ['admin', 'ppic', 'qc']);
    }

    /**
     * Determine whether the user can view the shipment.
     */
    public function view(User $user, Shipment $shipment): bool
    {
        $role = strtolower($user->role);
        if ($role === 'ppic') {
            return true;
        }

        // Assigned QC officer can view their assigned shipment
        if ($role === 'qc' && (int)$shipment->qc_users_id === (int)$user->id) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can update or modify rolls in the shipment.
     * Only Admin or the creator PPIC who initiated the shipment.
     */
    public function update(User $user, Shipment $shipment): bool
    {
        return (int)$shipment->admin_users_id === (int)$user->id;
    }

    /**
     * Determine whether the user can cancel the shipment.
     * Only Admin or the creator PPIC who initiated the shipment.
     */
    public function cancel(User $user, Shipment $shipment): bool
    {
        return (int)$shipment->admin_users_id === (int)$user->id;
    }

    /**
     * Determine whether the QC user can scan/reject rolls for this shipment.
     * Strict assignment check: only the specifically assigned QC inspector or admin.
     */
    public function qcProcess(User $user, Shipment $shipment): bool
    {
        return strtolower($user->role) === 'qc' && (int)$shipment->qc_users_id === (int)$user->id;
    }
}
