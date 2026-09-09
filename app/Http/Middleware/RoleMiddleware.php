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
            return redirect('/login');
        }

        $userRole = strtolower(auth()->user()->role ?? '');

        // Admin has access to everything
        if ($userRole === 'admin') {
            return $next($request);
        }

        if (empty($userRole) || !in_array($userRole, $roles, true)) {
            abort(403, 'Unauthorized action.');
        }

        return $next($request);
    }
}
