<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'shop_id', 'user_id', 'type', 'amount',
        'description', 'reference_id', 'balance_after', 'date'
    ];
}
