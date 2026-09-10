<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class UserController extends Controller
{

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
                'created' => $user->created_at ? $user->created_at->timezone('Asia/Jakarta')->format('Y-m-d') : '—',
                'lastActivity' => $user->last_login_at ? $user->last_login_at->timezone('Asia/Jakarta')->format('Y-m-d H:i') . ' WIB' : '—',
            ];
        });

        return Inertia::render('UserManagement', [
            'users' => $users,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:45|unique:users,username',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:6|confirmed',
            'role' => ['nullable', 'string', 'in:admin,ppic,production,qc'],
        ]);

        $role = !empty($validated['role']) ? strtolower($validated['role']) : 'production';

        User::create([
            'username' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $role,
        ]);

        return redirect()->back()->with('success', 'New user created successfully.');
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:45|unique:users,username,' . $user->id,
            'email' => 'required|email|max:255|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:6|confirmed',
            'role' => ['nullable', 'string', 'in:admin,ppic,production,qc'],
        ]);

        $updateData = [
            'username' => $validated['name'],
            'email' => $validated['email'],
            'role' => !empty($validated['role']) ? strtolower($validated['role']) : $user->role,
        ];

        if (!empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

        return redirect()->back()->with('success', 'User record updated successfully.');
    }

    public function destroy(User $user)
    {
        if ($user->id === auth()->id()) {
            return redirect()->back()->with('error', 'You cannot delete your own account.');
        }

        try {
            $user->delete();
            return redirect()->back()->with('success', 'User deleted successfully.');
        } catch (\Illuminate\Database\QueryException $e) {
            return redirect()->back()->with('error', 'Cannot delete user because they are associated with existing operational records (rolls, shipments, or audit logs).');
        }
    }

    public function profile()
    {
        return Inertia::render('Profile');
    }

    public function updateProfile(Request $request)
    {
        $user = auth()->user();
        $validated = $request->validate([
            'name' => 'required|string|max:45|unique:users,username,' . $user->id,
        ]);

        $user->update([
            'username' => $validated['name'],
        ]);

        return redirect()->back()->with('success', 'Profile updated successfully.');
    }

    public function updatePassword(Request $request)
    {
        $user = auth()->user();
        
        $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|string|min:6|confirmed',
        ]);

        if (!Hash::check($request->current_password, $user->password)) {
            return back()->withErrors(['current_password' => 'The provided password does not match your current password.']);
        }

        $user->update([
            'password' => Hash::make($request->new_password)
        ]);

        return redirect()->back()->with('success', 'Password updated successfully.');
    }
}
