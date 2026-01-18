<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Repair extends Model
{
    use HasFactory;

    protected $fillable = [
        'shop_id',
        'job_number',
        'vehicle_number',
        'customer_name',
        'customer_phone',
        'staff_id',
        'total_parts_cost',
        'service_charge',
        'grand_total',
        'status' // <--- Ensure this is here
    ];

    // THIS IS THE CRITICAL PART
    public function items()
    {
        return $this->hasMany(RepairItem::class);
    }

    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_id');
    }
}
