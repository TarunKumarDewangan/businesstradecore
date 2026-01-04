<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'shop_id',         // <--- Added this
        'retailer_id',     // <--- Added this
        'invoice_id',
        'order_number',
        'status',
        'delivery_type',
        'driver_id',
        'driver_name',
        'vehicle_details'
    ];

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function retailer()
    {
        return $this->belongsTo(User::class, 'retailer_id');
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }
}
