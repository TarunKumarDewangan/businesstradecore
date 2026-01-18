<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RepairItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'repair_id',
        'item_id',
        'item_name',
        'quantity',
        'unit_price',
        'total_price'
    ];

    public function repair()
    {
        return $this->belongsTo(Repair::class);
    }
}
