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
    // 1. ALL AUTHENTICATED ROLES
    Route::get('/profile', [DesignUiController::class, 'profile']);
    Route::put('/profile/update', [UserController::class, 'updateProfile']);
    Route::put('/profile/password', [UserController::class, 'updatePassword']);

    // 2. ADMIN ONLY
    Route::middleware('role:admin')->group(function () {
        Route::get('/user-management', [UserController::class, 'index']);
        Route::post('/user-management', [UserController::class, 'store']);
        Route::put('/user-management/{user}', [UserController::class, 'update']);
        Route::delete('/user-management/{user}', [UserController::class, 'destroy']);

        Route::get('/ocr-monitoring', [DesignUiController::class, 'ocrMonitoring']);
        Route::get('/training', [SpectrumEngineController::class, 'trainingPage']);
        Route::get('/recommendation-logs', [\App\Http\Controllers\RecommendationLogController::class, 'index']);
    });

    // 3. ADMIN + PPIC
    Route::middleware('role:admin,ppic')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index']);
        Route::get('/warehouse-map', [DesignUiController::class, 'warehouseMap']);
        Route::get('/slot-status', [DesignUiController::class, 'slotStatus']);
        Route::get('/target-order', [DesignUiController::class, 'targetOrder']);
        Route::post('/jop', [\App\Http\Controllers\JopController::class, 'store']);
        Route::get('/spk-po', [DesignUiController::class, 'spkPo']);
        Route::get('/reports', [DesignUiController::class, 'reports']);
        Route::get('/notifications', [DesignUiController::class, 'notifications']);
        Route::post('/notifications/read-all', [DesignUiController::class, 'readAllNotifications']);

        Route::get('/shipments', [ShipmentController::class, 'index']);
        Route::get('/shipment-history', [ShipmentController::class, 'history']);
        Route::post('/shipments', [ShipmentController::class, 'store']);
        Route::delete('/shipments/{id}/roll/{rollNo}', [ShipmentController::class, 'cancelRoll']);
        Route::delete('/shipments/{id}/cancel', [ShipmentController::class, 'cancelShipment']);

        Route::put('/locations/bulk-update', [\App\Http\Controllers\LocationController::class, 'bulkUpdate']);
        Route::put('/locations/{id}', [\App\Http\Controllers\LocationController::class, 'update']);

        // Production Schedule — Admin + PPIC only
        Route::get('/production-schedule', [\App\Http\Controllers\ProductionScheduleController::class, 'index']);
        Route::post('/production-schedule', [\App\Http\Controllers\ProductionScheduleController::class, 'store']);
        Route::put('/production-schedule/{id}', [\App\Http\Controllers\ProductionScheduleController::class, 'update']);
        Route::delete('/production-schedule/{id}', [\App\Http\Controllers\ProductionScheduleController::class, 'destroy']);
    });

    // 4. ADMIN + PRODUCTION
    Route::middleware('role:admin,production')->group(function () {
        Route::get('/incoming-roll', [DesignUiController::class, 'incomingRoll']);
        Route::post('/incoming-roll', [IncomingRollController::class, 'store']);
        Route::get('/incoming-roll/check-roll-number', [IncomingRollController::class, 'checkRollNumber']);
        Route::post('/incoming-roll/recommend-form', [IncomingRollController::class, 'recommendFormNumber']);
        Route::post('/api/spectrum/recommend-location', [SpectrumEngineController::class, 'recommendLocation']);
    });

    // 5. PRODUCTION ACCESSIBLE JOP VIEW & EXPORT
    Route::middleware('role:admin,ppic,production')->group(function () {
        Route::get('/jop', [DesignUiController::class, 'jop']);
        Route::get('/jop/export-excel', [\App\Http\Controllers\JopController::class, 'exportExcel']);
        Route::get('/jop-master-data', [\App\Http\Controllers\JopController::class, 'masterData']);
    });

    // 6. ADMIN + QC
    Route::middleware('role:admin,qc')->group(function () {
        Route::post('/shipments/qc/scan', [ShipmentController::class, 'qcScan']);
        Route::post('/shipments/qc/reject', [ShipmentController::class, 'qcReject']);
    });

    // 7. ADMIN + PPIC + QC + PRODUCTION (Roll History & Inventory)
    Route::middleware('role:admin,ppic,qc,production')->group(function () {
        Route::get('/roll-inventory', [RollController::class, 'index']);
        Route::get('/roll-detail/{id?}', [RollController::class, 'show']);
    });

    Route::middleware('role:admin,ppic,qc')->group(function () {
        Route::put('/rolls/{id}', [RollController::class, 'update']);
        Route::delete('/rolls/{id}', [RollController::class, 'destroy']);
        Route::post('/rolls/ship', [RollController::class, 'confirmShipments']);
    });
});

Route::get('/api/spectrum/stats', [SpectrumEngineController::class, 'stats']);
Route::get('/api/spectrum/retrain-status', [SpectrumEngineController::class, 'retrainStatus']);
Route::get('/api/spectrum/insights', [SpectrumEngineController::class, 'modelInsights']);

Route::withoutMiddleware([\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class])
    ->group(function () {
        Route::post('/api/spectrum/detect', [SpectrumEngineController::class, 'detect']);
        Route::post('/api/spectrum/log', [SpectrumEngineController::class, 'logTestResult']);
        Route::post('/api/spectrum/retrain', [SpectrumEngineController::class, 'retrain']);
        Route::post('/api/spectrum/save-dataset', [SpectrumEngineController::class, 'saveDataset']);
    });
