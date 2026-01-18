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

            // Core Links
            $table->foreignId('shop_id')->constrained('shops')->onDelete('cascade');
            $table->foreignId('retailer_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('order_id')->constrained('orders'); // Which order it came from
            $table->foreignId('item_id')->constrained('items'); // Which item is being returned

            // Details
            $table->integer('quantity');
            $table->string('reason'); // e.g., "Damaged in transit"

            // Phase 1: Financial Approval (Credit Note)
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->unsignedBigInteger('transaction_id')->nullable(); // Link to Credit Transaction

            // Phase 2: Physical Inspection (Stock Update)
            $table->enum('inspection_status', ['pending', 'restocked', 'scrapped'])->default('pending');

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
