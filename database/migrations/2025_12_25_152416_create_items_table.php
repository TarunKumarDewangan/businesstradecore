<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('items', function (Blueprint $table) {
            $table->id();

            /* =========================
               SHOP
            ========================= */
            $table->unsignedBigInteger('shop_id');
            $table->index('shop_id');

            /* =========================
               CATEGORY
            ========================= */
            $table->unsignedBigInteger('category_id');
            $table->index('category_id');

            /* =========================
               SUBCATEGORY (OPTIONAL)
            ========================= */
            $table->unsignedBigInteger('subcategory_id')->nullable();
            $table->index('subcategory_id');

            /* =========================
               LOCATION (OPTIONAL)
            ========================= */
            $table->unsignedBigInteger('location_id')->nullable();
            $table->index('location_id');

            /* =========================
               ITEM DETAILS
            ========================= */
            $table->string('item_name');
            $table->string('part_number')->nullable();
            $table->text('compatible_models')->nullable();

            /* =========================
               FINANCIALS
            ========================= */
            $table->decimal('purchase_price', 10, 2)->default(0);
            $table->decimal('selling_price', 10, 2)->default(0);
            $table->integer('stock_quantity')->default(0);

            $table->timestamps();

            /* =========================
               FOREIGN KEYS (EXPLICIT NAMES)
            ========================= */
            $table->foreign('shop_id', 'fk_items_shop')
                ->references('id')
                ->on('shops')
                ->cascadeOnDelete();

            $table->foreign('category_id', 'fk_items_category')
                ->references('id')
                ->on('categories')
                ->restrictOnDelete();

            $table->foreign('subcategory_id', 'fk_items_subcategory')
                ->references('id')
                ->on('categories')
                ->nullOnDelete();

            $table->foreign('location_id', 'fk_items_location')
                ->references('id')
                ->on('locations')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};
