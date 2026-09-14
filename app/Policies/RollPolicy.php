<?php

namespace App\Policies;

use App\Models\Roll;
use App\Models\User;

class RollPolicy
{
    /**
     * Super-admin bypass: admins can perform any action.
     */
    public function before(User $user, string $ability): ?bool
    {
        if (strtolower($user->role) === 'admin') {
            return true;
        }

        return null;
    }

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return in_array(strtolower($user->role), ['admin', 'ppic', 'qc', 'production']);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Roll $roll): bool
    {
        return in_array(strtolower($user->role), ['admin', 'ppic', 'qc', 'production']);
    }

    /**
     * Determine whether the user can update the model.
     * Checks data ownership (the user who logged/created the roll),
     * or QC role for quality control adjustments,
     * or PPIC for warehouse slot planning.
     */
    public function update(User $user, Roll $roll): bool
    {
        $role = strtolower($user->role);

        // Creator owns the roll record
        if ($roll->users_id && (int)$user->id === (int)$roll->users_id) {
            return true;
        }

        // QC can update roll quality status and QC fields
        if ($role === 'qc') {
            return true;
        }

        // PPIC can adjust slot/allocation
        if ($role === 'ppic') {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can delete the model.
     * Only Admin or the creator can delete, and only if not part of an active/completed shipment.
     */
    public function delete(User $user, Roll $roll): bool
    {
        if ($roll->users_id && (int)$user->id === (int)$roll->users_id) {
            $inActiveShipment = $roll->shipmentRolls()
                ->whereHas('shipment', function ($q) {
                    $q->whereIn('status', ['pending', 'qc_in_progress', 'completed']);
                })
                ->exists();

            return !$inActiveShipment;
        }

        return false;
    }
}
