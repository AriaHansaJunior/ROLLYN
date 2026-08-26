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
        Schema::create('shipment_rolls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipment_id')->constrained('shipments')->onDelete('cascade');
            $table->integer('roll_no'); // Primary key for rolls is 'no' which is integer
            $table->foreign('roll_no')->references('no')->on('rolls')->onDelete('cascade');
            
            $table->enum('qc_status', ['pending', 'passed', 'rejected_replace'])->default('pending');
            $table->text('qc_notes')->nullable();
            $table->timestamp('qc_checked_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shipment_rolls');
    }
};
