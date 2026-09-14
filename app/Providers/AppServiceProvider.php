<?php

namespace App\Providers;

use App\Models\Roll;
use App\Models\Shipment;
use App\Models\User;
use App\Policies\RollPolicy;
use App\Policies\ShipmentPolicy;
use App\Policies\UserPolicy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{

    public function register(): void
    {

    }

    public function boot(): void
    {
        // Prevent accidental unfillable mass assignment during development and testing
        Model::preventSilentlyDiscardingAttributes(! $this->app->isProduction());

        // Register authorization policies
        Gate::policy(Roll::class, RollPolicy::class);
        Gate::policy(Shipment::class, ShipmentPolicy::class);
        Gate::policy(User::class, UserPolicy::class);

        // Force HTTPS in production or when configured
        if (config('app.force_https', false) || $this->app->environment('production')) {
            URL::forceScheme('https');
        }
    }
}
