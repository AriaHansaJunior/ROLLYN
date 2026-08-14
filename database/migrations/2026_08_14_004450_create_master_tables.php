<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Shifts
        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->string('shift', 45);
            $table->timestamps();
        });

        // 2. Grades
        Schema::create('grades', function (Blueprint $table) {
            $table->id();
            $table->string('grade', 45);
            $table->timestamps();
        });

        // 3. GSMs
        Schema::create('gsms', function (Blueprint $table) {
            $table->id();
            $table->integer('gsm');
            $table->timestamps();
        });

        // 4. Plybonds
        Schema::create('plybonds', function (Blueprint $table) {
            $table->id();
            $table->integer('plybonds');
            $table->timestamps();
        });

        // 5. Thicknesses
        Schema::create('thicknesses', function (Blueprint $table) {
            $table->id();
            $table->integer('thickness');
            $table->timestamps();
        });

        // 6. Rolls Widths
        Schema::create('rolls_widths', function (Blueprint $table) {
            $table->id();
            $table->integer('width');
            $table->timestamps();
        });

        // 7. Rolls Diameters
        Schema::create('rolls_diameters', function (Blueprint $table) {
            $table->id();
            $table->integer('diameter');
            $table->timestamps();
        });

        // 8. Cores
        Schema::create('cores', function (Blueprint $table) {
            $table->id();
            $table->string('core', 45);
            $table->timestamps();
        });

        // 9. Cobbs
        Schema::create('cobbs', function (Blueprint $table) {
            $table->id();
            $table->string('cobb', 45);
            $table->timestamps();
        });

        // 10. Locations
        Schema::create('locations', function (Blueprint $table) {
            $table->id();
            $table->string('location', 45);
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
        });

        // 11. Customers
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('customer', 45);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('locations');
        Schema::dropIfExists('cobbs');
        Schema::dropIfExists('cores');
        Schema::dropIfExists('rolls_diameters');
        Schema::dropIfExists('rolls_widths');
        Schema::dropIfExists('thicknesses');
        Schema::dropIfExists('plybonds');
        Schema::dropIfExists('gsms');
        Schema::dropIfExists('grades');
        Schema::dropIfExists('shifts');
    }
};