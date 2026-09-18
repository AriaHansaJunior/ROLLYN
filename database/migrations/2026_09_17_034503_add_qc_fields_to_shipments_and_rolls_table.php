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
        Schema::table('shipment_rolls', function (Blueprint $table) {
            $table->json('qc_issues')->nullable()->after('qc_notes');
        });

        Schema::table('shipments', function (Blueprint $table) {
            $table->json('qc_report_notes')->nullable()->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shipment_rolls', function (Blueprint $table) {
            $table->dropColumn('qc_issues');
        });

        Schema::table('shipments', function (Blueprint $table) {
            $table->dropColumn('qc_report_notes');
        });
    }
};
