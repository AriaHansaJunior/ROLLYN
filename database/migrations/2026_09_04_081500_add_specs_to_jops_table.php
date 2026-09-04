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
        Schema::table('jops', function (Blueprint $table) {
            $table->foreignId('plybonds_id')->nullable()->after('rolls_widths_id')->constrained('plybonds')->nullOnDelete();
            $table->foreignId('thicknesses_id')->nullable()->after('plybonds_id')->constrained('thicknesses')->nullOnDelete();
            $table->foreignId('cores_id')->nullable()->after('thicknesses_id')->constrained('cores')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('jops', function (Blueprint $table) {
            $table->dropForeign(['plybonds_id']);
            $table->dropForeign(['thicknesses_id']);
            $table->dropForeign(['cores_id']);
            $table->dropColumn(['plybonds_id', 'thicknesses_id', 'cores_id']);
        });
    }
};
