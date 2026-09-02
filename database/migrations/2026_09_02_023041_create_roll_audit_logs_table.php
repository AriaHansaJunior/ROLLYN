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
        Schema::create('roll_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->integer('rolls_no');
            $table->foreign('rolls_no')->references('no')->on('rolls')->onDelete('cascade');
            $table->foreignId('users_id')->constrained('users');
            $table->string('field_name');
            $table->string('old_value')->nullable();
            $table->string('new_value')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('roll_audit_logs');
    }
};
