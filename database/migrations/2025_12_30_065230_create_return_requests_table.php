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
        Schema::create('return_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained('shops')->onDelete('cascade');
            $table->foreignId('retailer_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('order_id')->constrained('orders');
            $table->foreignId('item_id')->constrained('items');

            $table->integer('quantity');
            $table->string('reason'); // "Damaged", "Wrong Item"
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');

            // If approved, we can link a Credit Note Transaction ID
            $table->unsignedBigInteger('transaction_id')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('return_requests');
    }
};
