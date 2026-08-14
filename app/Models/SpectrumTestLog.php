<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SpectrumTestLog extends Model
{
    use HasFactory;

    protected $table = 'spectrum_test_logs';

    protected $fillable = [
        'image_path',
        'ocr_legacy_result',
        'ocr_legacy_confidence',
        'spectrum_result',
        'spectrum_confidence',
        'actual_manual_input',
        'selected_source',
    ];

    protected $casts = [
        'ocr_legacy_confidence' => 'float',
        'spectrum_confidence' => 'float',
        'actual_manual_input' => 'float',
    ];
}
