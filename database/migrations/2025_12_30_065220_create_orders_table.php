<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained('shops')->onDelete('cascade');
            $table->foreignId('retailer_id')->constrained('users')->onDelete('cascade'); // The Customer

            // Link to Invoice (Null initially, filled when Master approves)
            $table->unsignedBigInteger('invoice_id')->nullable();

            $table->string('order_number')->unique(); // ORD-2025-001
            $table->enum('status', ['pending', 'processing', 'dispatched', 'delivered', 'cancelled', 'returned'])->default('pending');

            // Delivery Info
            $table->enum('delivery_type', ['staff', 'partner', 'pickup'])->nullable();
            $table->unsignedBigInteger('driver_id')->nullable(); // Can be User ID (Staff) or DeliveryPartner ID
            $table->string('driver_name')->nullable(); // Cached name for quick view
            $table->string('vehicle_details')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
