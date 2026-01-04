<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RetailerDetail extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'shop_id',
        'customer_type', // <--- Added this
        'retailer_shop_name',
        'gst_number',
        'address',
        'credit_limit',
        'current_balance'
    ];
}
