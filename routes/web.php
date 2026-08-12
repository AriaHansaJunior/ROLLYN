<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DesignUiController;

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
