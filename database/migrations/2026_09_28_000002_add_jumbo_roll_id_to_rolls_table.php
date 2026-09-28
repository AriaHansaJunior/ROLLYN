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
            $table->foreignId('jumbo_roll_id')
                ->nullable()
                ->after('jops_id')
                ->constrained('jumbo_rolls')
                ->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rolls', function (Blueprint $table) {
            $table->dropForeign(['jumbo_roll_id']);
            $table->dropColumn('jumbo_roll_id');
        });
    }
};
