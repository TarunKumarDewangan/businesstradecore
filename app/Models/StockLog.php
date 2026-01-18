<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'shop_id', 'item_id', 'user_id',
        'type', 'quantity', 'balance_after', 'reason'
    ];

    public function item() {
        return $this->belongsTo(Item::class);
    }

    public function user() {
        return $this->belongsTo(User::class);
    }
}
