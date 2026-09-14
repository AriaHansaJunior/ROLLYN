<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /**
     * Super-admin bypass: admins can manage users.
     */
    public function before(User $user, string $ability): ?bool
    {
        if (strtolower($user->role) === 'admin') {
            return true;
        }

        return null;
    }

    /**
     * Determine whether the user can view user list.
     */
    public function viewAny(User $user): bool
    {
        return strtolower($user->role) === 'admin';
    }

    /**
     * Determine whether the user can update the model.
     * Admin can update any user, or user can update their own account.
     */
    public function update(User $user, User $model): bool
    {
        return (int)$user->id === (int)$model->id;
    }

    /**
     * Determine whether the user can delete the model.
     * Admin only, and cannot delete own account.
     */
    public function delete(User $user, User $model): bool
    {
        return strtolower($user->role) === 'admin' && (int)$user->id !== (int)$model->id;
    }
}
