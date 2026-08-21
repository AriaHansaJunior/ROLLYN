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
        Schema::create('location_recommendation_logs', function (Blueprint $table) {
            $table->id();
            $table->integer('rolls_no')->nullable();
            $table->string('no_roll', 45)->nullable();
            $table->foreignId('users_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('action_type', ['ASSIGN', 'MOVE'])->default('ASSIGN');
            $table->foreignId('previous_locations_id')->nullable()->constrained('locations')->nullOnDelete();
            $table->foreignId('recommended_locations_id')->nullable()->constrained('locations')->nullOnDelete();
            $table->foreignId('selected_locations_id')->nullable()->constrained('locations')->nullOnDelete();
            $table->boolean('is_match')->default(0)->comment('1: Selected matches recommendation (True), 0: User chose different slot (False)');
            $table->text('notes')->nullable();
            $table->timestamps();

            // Foreign key to rolls.no
            $table->foreign('rolls_no')->references('no')->on('rolls')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('location_recommendation_logs');
    }
};
