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
        Schema::create('repairs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained('shops')->onDelete('cascade');

            // Job Details
            $table->string('job_number')->unique(); // JOB-1001
            $table->string('vehicle_number');
            $table->string('customer_name')->nullable();
            $table->string('customer_phone')->nullable();

            // Mechanic who did the job (User ID)
            $table->foreignId('staff_id')->constrained('users');

            // Costs
            $table->decimal('total_parts_cost', 10, 2)->default(0);
            $table->decimal('service_charge', 10, 2)->default(0); // Labor
            $table->decimal('grand_total', 10, 2)->default(0);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('repairs');
    }
};
