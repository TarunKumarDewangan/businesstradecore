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
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained('shops')->onDelete('cascade'); // Link to Shop
            $table->string('name');
            $table->enum('type', ['main', 'sub'])->default('main'); // Main or Sub category
            $table->unsignedBigInteger('parent_id')->nullable(); // If Sub, who is the parent?
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // Optional: Foreign key for parent_id referencing categories id
            $table->foreign('parent_id')->references('id')->on('categories')->onDelete('cascade');
        });
    }
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
