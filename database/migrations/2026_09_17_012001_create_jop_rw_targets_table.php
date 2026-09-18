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
        Schema::create('jop_rw_targets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('jop_id')->constrained('jops')->onDelete('cascade');
            $table->foreignId('rolls_width_id')->constrained('rolls_widths')->onDelete('cascade');
            $table->integer('qty');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jop_rw_targets');
    }
};
