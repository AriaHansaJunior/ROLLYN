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
        Schema::create('production_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('jops_id')->constrained('jops')->onDelete('cascade');

            // New schedule-specific data only — no SPK/PO/Customer/Grade/GSM duplication
            $table->decimal('tonnage', 10, 2);
            $table->string('rewinder_cut', 255)->nullable(); // e.g. "(1120 x 3) + 1140"
            $table->decimal('tph', 8, 2);                    // Ton per Hour input
            $table->integer('production_hours');              // ceil(tonnage / tph)
            $table->dateTime('start_time');
            $table->dateTime('stop_time');                    // start_time + production_hours
            $table->longText('remark')->nullable();
            $table->string('status', 20)->default('OPEN');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('production_schedules');
    }
};
