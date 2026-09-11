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
        Schema::table('jops', function (Blueprint $table) {
            $table->decimal('tph', 8, 2)->nullable()->after('noted_order');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('jops', function (Blueprint $table) {
            $table->dropColumn('tph');
        });
    }
};
