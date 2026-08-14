<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('spectrum_test_logs', function (Blueprint $table) {
            $table->id();
            $table->string('image_path')->nullable();
            $table->string('ocr_legacy_result')->nullable();
            $table->float('ocr_legacy_confidence')->nullable();
            $table->string('spectrum_result')->nullable();
            $table->float('spectrum_confidence')->nullable();
            $table->float('actual_manual_input')->nullable();
            $table->string('selected_source')->nullable(); // 'ocr' | 'spectrum' | 'manual'
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('spectrum_test_logs');
    }
};
