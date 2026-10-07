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
        Schema::table('rolls', function (Blueprint $table) {
            $table->string('reproduction_status')->nullable()->default(null)->after('status');
        });

        Schema::table('shipment_rolls', function (Blueprint $table) {
            $table->string('reproduction_status')->nullable()->default(null)->after('qc_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rolls', function (Blueprint $table) {
            $table->dropColumn('reproduction_status');
        });

        Schema::table('shipment_rolls', function (Blueprint $table) {
            $table->dropColumn('reproduction_status');
        });
    }
};
