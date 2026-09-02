<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\RollController;
use App\Http\Controllers\IncomingRollController;
use App\Http\Controllers\DesignUiController;
use App\Http\Controllers\SpectrumEngineController;
use App\Http\Controllers\ShipmentController;

Route::get('/', function () {
    return redirect('/dashboard');
});

Route::get('/login', [AuthController::class, 'showLoginForm'])->name('login');
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout']);

Route::middleware('auth')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/warehouse-map', [DesignUiController::class, 'warehouseMap']);
    Route::get('/slot-status', [DesignUiController::class, 'slotStatus']);
    Route::get('/incoming-roll', [DesignUiController::class, 'incomingRoll']);
    Route::post('/incoming-roll', [IncomingRollController::class, 'store']);
    Route::post('/incoming-roll/recommend-form', [IncomingRollController::class, 'recommendFormNumber']);

    Route::get('/ocr-monitoring', [DesignUiController::class, 'ocrMonitoring']);
    Route::get('/target-order', [DesignUiController::class, 'targetOrder']);
    Route::get('/jop', [DesignUiController::class, 'jop']);
    Route::post('/jop', [\App\Http\Controllers\JopController::class, 'store']);
    Route::get('/jop-master-data', [\App\Http\Controllers\JopController::class, 'masterData']);
    Route::get('/spk-po', [DesignUiController::class, 'spkPo']);
    Route::get('/reports', [DesignUiController::class, 'reports']);
    Route::get('/profile', [DesignUiController::class, 'profile']);
    Route::put('/profile/update', [UserController::class, 'updateProfile']);
    Route::put('/profile/password', [UserController::class, 'updatePassword']);
    Route::get('/notifications', [DesignUiController::class, 'notifications']);
    Route::post('/notifications/read-all', [DesignUiController::class, 'readAllNotifications']);

    Route::get('/user-management', [UserController::class, 'index']);
    Route::post('/user-management', [UserController::class, 'store']);
    Route::put('/user-management/{user}', [UserController::class, 'update']);
    Route::delete('/user-management/{user}', [UserController::class, 'destroy']);

    Route::get('/recommendation-logs', [\App\Http\Controllers\RecommendationLogController::class, 'index']);

    Route::post('/rolls/ship', [RollController::class, 'confirmShipments']);
    Route::get('/roll-inventory', [RollController::class, 'index']);
    Route::get('/roll-detail/{id?}', [RollController::class, 'show']);
    Route::put('/rolls/{id}', [RollController::class, 'update']);
    Route::delete('/rolls/{id}', [RollController::class, 'destroy']);
    Route::put('/locations/bulk-update', [\App\Http\Controllers\LocationController::class, 'bulkUpdate']);
    Route::put('/locations/{id}', [\App\Http\Controllers\LocationController::class, 'update']);

    Route::get('/shipments', [ShipmentController::class, 'index']);
    Route::get('/shipment-history', [ShipmentController::class, 'history']);
    Route::post('/shipments', [ShipmentController::class, 'store']);
    Route::post('/shipments/qc/scan', [ShipmentController::class, 'qcScan']);
    Route::post('/shipments/qc/reject', [ShipmentController::class, 'qcReject']);
    Route::delete('/shipments/{id}/roll/{rollNo}', [ShipmentController::class, 'cancelRoll']);
    Route::delete('/shipments/{id}/cancel', [ShipmentController::class, 'cancelShipment']);

    Route::get('/training', [SpectrumEngineController::class, 'trainingPage']);
});

Route::get('/api/spectrum/stats', [SpectrumEngineController::class, 'stats']);
Route::get('/api/spectrum/retrain-status', [SpectrumEngineController::class, 'retrainStatus']);
Route::get('/api/spectrum/insights', [SpectrumEngineController::class, 'modelInsights']);
Route::post('/api/spectrum/recommend-location', [SpectrumEngineController::class, 'recommendLocation']);

Route::withoutMiddleware([\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class])
    ->group(function () {
        Route::post('/api/spectrum/detect', [SpectrumEngineController::class, 'detect']);
        Route::post('/api/spectrum/log', [SpectrumEngineController::class, 'logTestResult']);
        Route::post('/api/spectrum/retrain', [SpectrumEngineController::class, 'retrain']);
        Route::post('/api/spectrum/save-dataset', [SpectrumEngineController::class, 'saveDataset']);
    });
