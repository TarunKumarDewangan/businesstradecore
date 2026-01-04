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
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained('shops')->onDelete('cascade');

            // Customer Info (Nullable because it could be a Walk-in customer)
            $table->unsignedBigInteger('customer_id')->nullable(); // Linked to Users (Retailer)
            $table->string('customer_name')->nullable(); // For Walk-in
            $table->string('customer_phone')->nullable();

            // Bill Details
            $table->string('invoice_number')->unique(); // e.g. INV-1001
            $table->decimal('total_amount', 12, 2); // Subtotal
            $table->decimal('discount', 12, 2)->default(0);
            $table->decimal('grand_total', 12, 2); // Final Amount

            // Payment
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->enum('payment_mode', ['cash', 'online', 'credit', 'mixed'])->default('cash');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
