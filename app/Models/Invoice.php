<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'shop_id', 'customer_id', 'customer_name', 'customer_phone',
        'invoice_number', 'total_amount', 'discount', 'grand_total',
        'paid_amount', 'payment_mode'
    ];

    public function items() {
        return $this->hasMany(InvoiceItem::class);
    }

    public function customer() {
        return $this->belongsTo(User::class, 'customer_id');
    }
}
