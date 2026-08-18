<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait ApiResponse
{

    protected function successResponse($data = null, string $message = 'Success', int $code = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data
        ], $code);
    }

    protected function errorResponse(string $message, int $code, $debug = null): JsonResponse
    {
        $response = [
            'success' => false,
            'message' => $message
        ];

        if ($debug && config('app.debug')) {
            $response['debug'] = $debug;
        }

        return response()->json($response, $code);
    }

    protected function validationErrorResponse($errors, string $message = 'Validation Error', int $code = 422): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors' => $errors
        ], $code);
    }
}
