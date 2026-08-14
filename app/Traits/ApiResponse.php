<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait ApiResponse
{
    /**
     * Build a success response
     *
     * @param mixed $data
     * @param string $message
     * @param int $code
     * @return \Illuminate\Http\JsonResponse
     */
    protected function successResponse($data = null, string $message = 'Success', int $code = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data
        ], $code);
    }

    /**
     * Build an error response
     *
     * @param string $message
     * @param int $code
     * @param mixed $debug
     * @return \Illuminate\Http\JsonResponse
     */
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

    /**
     * Build a validation error response
     *
     * @param mixed $errors
     * @param string $message
     * @param int $code
     * @return \Illuminate\Http\JsonResponse
     */
    protected function validationErrorResponse($errors, string $message = 'Validation Error', int $code = 422): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors' => $errors
        ], $code);
    }
}
