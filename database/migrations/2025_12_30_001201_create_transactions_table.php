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
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained('shops')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade'); // The Retailer

            $table->enum('type', ['debit', 'credit']); // debit = bought items, credit = paid money
            $table->decimal('amount', 12, 2);
            $table->string('description')->nullable(); // e.g. "Invoice #101" or "Cash Payment"
            $table->string('reference_id')->nullable(); // Invoice ID or Payment Ref

            // To track running balance at that specific moment
            $table->decimal('balance_after', 12, 2);

            $table->date('date');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
