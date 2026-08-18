<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    Route::post('/auth/login', [\App\Http\Controllers\Api\V1\AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [\App\Http\Controllers\Api\V1\AuthController::class, 'logout']);
        Route::get('/auth/me', [\App\Http\Controllers\Api\V1\AuthController::class, 'me']);

        Route::prefix('master')->group(function () {
            Route::apiResource('customers', \App\Http\Controllers\Api\V1\Master\CustomerController::class);
            Route::apiResource('grades', \App\Http\Controllers\Api\V1\Master\GradeController::class);
            Route::apiResource('gsms', \App\Http\Controllers\Api\V1\Master\GsmController::class);
            Route::apiResource('shifts', \App\Http\Controllers\Api\V1\Master\ShiftController::class);
            Route::apiResource('widths', \App\Http\Controllers\Api\V1\Master\RollsWidthController::class);
            Route::apiResource('specifications', \App\Http\Controllers\Api\V1\Master\SpecificationController::class);
        });

        Route::get('/jops/dropdown/active', [\App\Http\Controllers\Api\V1\JopController::class, 'dropdownActive']);
        Route::apiResource('jops', \App\Http\Controllers\Api\V1\JopController::class);

        Route::post('/rolls/validate-no', [\App\Http\Controllers\Api\V1\RollController::class, 'validateNo']);
        Route::apiResource('rolls', \App\Http\Controllers\Api\V1\RollController::class)->except(['destroy']);

        Route::get('/analytics/dashboard-summary', [\App\Http\Controllers\Api\V1\AnalyticsController::class, 'dashboardSummary']);
        Route::get('/reports/rolls', [\App\Http\Controllers\Api\V1\AnalyticsController::class, 'rollReports']);
        Route::post('/reports/export/excel', [\App\Http\Controllers\Api\V1\AnalyticsController::class, 'exportExcel']);
    });
});
