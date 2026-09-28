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
        Schema::create('jumbo_rolls', function (Blueprint $table) {
            $table->id();
            $table->string('jumbo_roll_number', 50)->unique();
            $table->foreignId('jops_id')->constrained('jops')->onDelete('restrict');
            $table->decimal('weight', 10, 2); // Jumbo roll weight in kg (e.g. 18500.00 kg)
            $table->date('production_date');
            $table->string('status', 30)->default('IN_PROGRESS'); // IN_PROGRESS, COMPLETED, HOLD
            $table->text('notes')->nullable();
            $table->foreignId('users_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jumbo_rolls');
    }
};
