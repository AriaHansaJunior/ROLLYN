<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rolls', function (Blueprint $table) {
            $table->integer('no')->primary(); // Berdasarkan gambar ERD 'no' adalah Primary Key INT
            $table->string('no_roll', 45)->unique();
            $table->integer('form')->nullable();
            
            // Foreign Keys
            $table->foreignId('shifts_id')->constrained('shifts');
            $table->date('entry_date')->useCurrent();
            $table->foreignId('grades_id')->constrained('grades');
            $table->foreignId('plybonds_id')->nullable()->constrained('plybonds');
            $table->foreignId('thicknesses_id')->nullable()->constrained('thicknesses');
            
            $table->decimal('bulk', 8, 2)->nullable();
            
            $table->foreignId('rolls_diameters_id')->nullable()->constrained('rolls_diameters');
            $table->integer('weight')->nullable();
            $table->foreignId('cores_id')->nullable()->constrained('cores');
            $table->foreignId('cobbs_id')->nullable()->constrained('cobbs');
            
            $table->enum('exmaterial', ['IMPORT', 'LOCAL'])->default('IMPORT');
            $table->foreignId('locations_id')->nullable()->constrained('locations');
            
            $table->longText('visual')->nullable();
            $table->foreignId('users_id')->nullable()->constrained('users');
            $table->foreignId('jops_id')->nullable()->constrained('jops');
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rolls');
    }
};