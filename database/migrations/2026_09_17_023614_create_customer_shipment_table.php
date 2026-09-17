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
        Schema::create('customer_shipment', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade');
            $table->foreignId('shipment_id')->constrained('shipments')->onDelete('cascade');
            $table->timestamps();
        });

        // Migrate existing data
        $shipments = \Illuminate\Support\Facades\DB::table('shipments')->get();
        foreach ($shipments as $shipment) {
            if ($shipment->customers_id) {
                \Illuminate\Support\Facades\DB::table('customer_shipment')->insert([
                    'customer_id' => $shipment->customers_id,
                    'shipment_id' => $shipment->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        Schema::table('shipments', function (Blueprint $table) {
            $table->dropForeign(['customers_id']);
            $table->dropColumn('customers_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->foreignId('customers_id')->nullable()->constrained('customers');
        });

        // Try to restore first customer to shipments
        $pivots = \Illuminate\Support\Facades\DB::table('customer_shipment')->get();
        foreach ($pivots as $pivot) {
            \Illuminate\Support\Facades\DB::table('shipments')
                ->where('id', $pivot->shipment_id)
                ->whereNull('customers_id')
                ->update(['customers_id' => $pivot->customer_id]);
        }

        Schema::dropIfExists('customer_shipment');
    }
};
