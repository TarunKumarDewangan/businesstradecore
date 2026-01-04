<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReturnRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'shop_id',        // <--- This was missing or blocked
        'retailer_id',
        'order_id',
        'item_id',
        'quantity',
        'reason',
        'status',
        'transaction_id'
    ];

    public function item()
    {
        return $this->belongsTo(Item::class);
    }

    public function retailer()
    {
        return $this->belongsTo(User::class, 'retailer_id');
    }
}
