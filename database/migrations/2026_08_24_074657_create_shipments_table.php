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
        Schema::create('shipments', function (Blueprint $table) {
            $table->id();
            $table->string('shipment_number')->unique();
            $table->foreignId('customers_id')->constrained('customers');
            $table->foreignId('admin_users_id')->constrained('users');
            $table->foreignId('qc_users_id')->constrained('users');
            $table->enum('status', ['pending', 'qc_in_progress', 'completed', 'canceled'])->default('pending');
            $table->date('shipment_date');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shipments');
    }
};
