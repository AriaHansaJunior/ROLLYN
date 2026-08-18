<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jops', function (Blueprint $table) {
            $table->id();
            $table->string('spk', 45);
            $table->string('jop', 45);
            $table->string('po', 45);

            $table->foreignId('customers_id')->constrained('customers')->onDelete('cascade');
            $table->foreignId('grades_id')->constrained('grades')->onDelete('cascade');
            $table->foreignId('gsms_id')->constrained('gsms')->onDelete('cascade');
            $table->foreignId('rolls_widths_id')->nullable()->constrained('rolls_widths')->onDelete('set null');

            $table->integer('quantity')->nullable();
            $table->integer('weight')->nullable();
            $table->integer('container')->nullable();
            $table->longText('noted_order')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jops');
    }
};