<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function showLoginForm()
    {
        return Inertia::render('Login');
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (Auth::attempt($credentials)) {

            $user = Auth::user();
            $user->update(['last_login_at' => now()]);

            $request->session()->regenerate();
            
            $role = strtolower($user->role ?? 'admin');
            $redirectPath = '/dashboard';
            
            if ($role === 'production') {
                $redirectPath = '/incoming-roll';
            } elseif ($role === 'qc') {
                $redirectPath = '/roll-inventory';
            }
            
            return redirect()->intended($redirectPath);
        }

        return back()->withErrors([
            'email' => 'The provided credentials do not match our records.',
        ]);
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect('/login')->with('success', 'Logout successful!');
    }
}
