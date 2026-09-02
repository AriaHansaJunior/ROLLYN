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
        Schema::table('rolls', function (Blueprint $table) {
            $table->enum('status', ['OK', 'HOLD'])->default('OK')->after('visual');
            $table->foreignId('gsms_id')->nullable()->after('grades_id')->constrained('gsms');
            $table->foreignId('rolls_widths_id')->nullable()->after('rolls_diameters_id')->constrained('rolls_widths');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rolls', function (Blueprint $table) {
            $table->dropForeign(['gsms_id']);
            $table->dropForeign(['rolls_widths_id']);
            $table->dropColumn(['status', 'gsms_id', 'rolls_widths_id']);
        });
    }
};
