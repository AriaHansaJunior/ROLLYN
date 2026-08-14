<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DesignUiController;
use App\Http\Controllers\SpectrumEngineController;

Route::get('/', function () {
    return redirect('/dashboard');
});

Route::get('/login', [DesignUiController::class, 'login'])->name('login');
Route::get('/dashboard', [DesignUiController::class, 'dashboard']);
Route::get('/warehouse-map', [DesignUiController::class, 'warehouseMap']);
Route::get('/roll-inventory', [DesignUiController::class, 'rollInventory']);
Route::get('/roll-detail', [DesignUiController::class, 'rollDetail']);
Route::get('/slot-status', [DesignUiController::class, 'slotStatus']);
Route::get('/incoming-roll', [DesignUiController::class, 'incomingRoll']);
Route::get('/ocr-monitoring', [DesignUiController::class, 'ocrMonitoring']);
Route::get('/target-order', [DesignUiController::class, 'targetOrder']);
Route::get('/jop', [DesignUiController::class, 'jop']);
Route::get('/spk-po', [DesignUiController::class, 'spkPo']);
Route::get('/reports', [DesignUiController::class, 'reports']);
Route::get('/user-management', [DesignUiController::class, 'userManagement']);
Route::get('/profile', [DesignUiController::class, 'profile']);
Route::get('/notifications', [DesignUiController::class, 'notifications']);

// Hidden SPECTRUM AI Training Dashboard (Accessible via URL only, not in main sidebar)
Route::get('/training', [SpectrumEngineController::class, 'trainingPage']);

// SPECTRUM Engine API Routes — GET endpoints (stats + retrain polling)
Route::get('/api/spectrum/stats', [SpectrumEngineController::class, 'stats']);
Route::get('/api/spectrum/retrain-status', [SpectrumEngineController::class, 'retrainStatus']);

// SPECTRUM Engine API Routes — POST endpoints (CSRF-exempt so XHR fetch from Inertia pages works without SPA token issues)
Route::withoutMiddleware([\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class])
    ->group(function () {
        Route::post('/api/spectrum/detect', [SpectrumEngineController::class, 'detect']);
        Route::post('/api/spectrum/log', [SpectrumEngineController::class, 'logTestResult']);
        Route::post('/api/spectrum/retrain', [SpectrumEngineController::class, 'retrain']);
        Route::post('/api/spectrum/save-dataset', [SpectrumEngineController::class, 'saveDataset']);
    });




