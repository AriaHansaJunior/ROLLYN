<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\RollController;
use App\Http\Controllers\IncomingRollController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\JopController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProductionScheduleController;
use App\Http\Controllers\RecommendationLogController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SpectrumEngineController;
use App\Http\Controllers\ShipmentController;

Route::get('/', function () {
    return redirect('/dashboard');
});

Route::get('/login', [AuthController::class, 'showLoginForm'])->name('login');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/logout', [AuthController::class, 'logout']);

Route::middleware('auth')->group(function () {
    // 1. ALL AUTHENTICATED ROLES
    Route::get('/profile', [UserController::class, 'profile']);
    Route::put('/profile/update', [UserController::class, 'updateProfile']);
    Route::put('/profile/password', [UserController::class, 'updatePassword']);

    // 2. ADMIN ONLY
    Route::middleware('role:admin')->group(function () {
        Route::get('/user-management', [UserController::class, 'index']);
        Route::post('/user-management', [UserController::class, 'store']);
        Route::put('/user-management/{user}', [UserController::class, 'update']);
        Route::delete('/user-management/{user}', [UserController::class, 'destroy']);

        Route::get('/ocr-monitoring', [SpectrumEngineController::class, 'ocrMonitoring']);
        Route::get('/training', [SpectrumEngineController::class, 'trainingPage']);
        Route::get('/recommendation-logs', [RecommendationLogController::class, 'index']);
        Route::post('/api/spectrum/retrain', [SpectrumEngineController::class, 'retrain'])
            ->withoutMiddleware([\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class])
            ->middleware('throttle:5,1');
    });

    // 3. ADMIN + PPIC
    Route::middleware('role:admin,ppic')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index']);
        Route::get('/warehouse-map', [LocationController::class, 'warehouseMap']);
        Route::get('/slot-status', [LocationController::class, 'slotStatus']);
        Route::get('/target-order', [JopController::class, 'targetOrder']);
        Route::post('/jop', [JopController::class, 'store']);
        Route::redirect('/spk-po', '/jop');
        Route::get('/reports', [ReportController::class, 'index']);
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/read-all', [NotificationController::class, 'readAll']);

        Route::get('/shipments', [ShipmentController::class, 'index']);
        Route::get('/shipment-history', [ShipmentController::class, 'history']);
        Route::post('/shipments', [ShipmentController::class, 'store']);
        Route::delete('/shipments/{id}/roll/{rollNo}', [ShipmentController::class, 'cancelRoll']);
        Route::delete('/shipments/{id}/cancel', [ShipmentController::class, 'cancelShipment']);

        Route::put('/locations/bulk-update', [LocationController::class, 'bulkUpdate']);
        Route::put('/locations/{id}', [LocationController::class, 'update']);

        // Production Schedule — Admin + PPIC only
        Route::get('/production-schedule', [ProductionScheduleController::class, 'index']);
        Route::post('/production-schedule', [ProductionScheduleController::class, 'store']);
        Route::put('/production-schedule/{id}', [ProductionScheduleController::class, 'update']);
        Route::delete('/production-schedule/{id}', [ProductionScheduleController::class, 'destroy']);
    });

    // 4. ADMIN + PRODUCTION
    Route::middleware('role:admin,production')->group(function () {
        Route::get('/incoming-roll', [IncomingRollController::class, 'index']);
        Route::post('/incoming-roll', [IncomingRollController::class, 'store']);
        Route::get('/incoming-roll/check-roll-number', [IncomingRollController::class, 'checkRollNumber']);
        Route::get('/incoming-roll/recommended-roll-number', [IncomingRollController::class, 'getRecommendedRollNumber']);
        Route::post('/incoming-roll/recommend-form', [IncomingRollController::class, 'recommendFormNumber']);
        Route::post('/api/spectrum/recommend-location', [SpectrumEngineController::class, 'recommendLocation']);
    });

    // 5. PRODUCTION ACCESSIBLE JOP VIEW & EXPORT
    Route::middleware('role:admin,ppic,production')->group(function () {
        Route::get('/jop', [JopController::class, 'index']);
        Route::get('/jop/export-excel', [JopController::class, 'exportExcel']);
        Route::get('/jop-master-data', [JopController::class, 'masterData']);
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

    // SPECTRUM AI Authenticated Endpoints
    Route::get('/api/spectrum/stats', [SpectrumEngineController::class, 'stats']);
    Route::get('/api/spectrum/retrain-status', [SpectrumEngineController::class, 'retrainStatus']);
    Route::get('/api/spectrum/insights', [SpectrumEngineController::class, 'modelInsights']);

    Route::withoutMiddleware([\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class])
        ->middleware('throttle:60,1')
        ->group(function () {
            Route::post('/api/spectrum/detect', [SpectrumEngineController::class, 'detect']);
            Route::post('/api/spectrum/log', [SpectrumEngineController::class, 'logTestResult']);
            Route::post('/api/spectrum/save-dataset', [SpectrumEngineController::class, 'saveDataset']);
        });
});
