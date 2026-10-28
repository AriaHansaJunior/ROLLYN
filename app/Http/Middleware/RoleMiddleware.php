<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{

    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        if (!auth()->check()) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }
            return redirect('/login');
        }

        $userRole = strtolower(trim(auth()->user()->role ?? ''));

        // Admin has access to everything
        if ($userRole === 'admin') {
            return $next($request);
        }

        $normalizedRoles = array_map(fn($r) => strtolower(trim($r)), $roles);

        if (empty($userRole) || !in_array($userRole, $normalizedRoles, true)) {
            abort(403, 'Unauthorized action.');
        }

        return $next($request);
    }
}
