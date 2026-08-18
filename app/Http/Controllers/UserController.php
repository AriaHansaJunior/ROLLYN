<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class UserController extends Controller
{
    /**
     * Display a listing of system administrators / users.
     */
    public function index()
    {
        $users = User::orderBy('id', 'desc')->get()->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->username,
                'username' => $user->username,
                'email' => $user->email ?? 'N/A',
                'role' => ucfirst($user->role),
                'status' => 'Active',
                'created' => $user->created_at ? $user->created_at->format('Y-m-d') : '—',
                'lastActivity' => $user->last_login_at ? $user->last_login_at->format('Y-m-d H:i') : '—',
            ];
        });

        return Inertia::render('UserManagement', [
            'users' => $users,
        ]);
    }

    /**
     * Store a newly created administrator in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:45|unique:users,username',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:6|confirmed',
            'role' => 'nullable|string',
        ]);

        User::create([
            'username' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'] ?? 'admin',
        ]);

        return redirect()->back()->with('success', 'New administrator created successfully.');
    }

    /**
     * Update the specified administrator in storage.
     */
    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:45|unique:users,username,' . $user->id,
            'email' => 'required|email|max:255|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:6|confirmed',
            'role' => 'nullable|string',
        ]);

        $updateData = [
            'username' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'] ?? $user->role,
        ];

        if (!empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

        return redirect()->back()->with('success', 'Administrator record updated successfully.');
    }

    /**
     * Remove the specified administrator from storage.
     */
    public function destroy(User $user)
    {
        $user->delete();

        return redirect()->back()->with('success', 'Administrator deleted successfully.');
    }
}
