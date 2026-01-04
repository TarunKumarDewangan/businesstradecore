<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Item extends Model
{
    use HasFactory;

    protected $fillable = [
        'shop_id',
        'category_id',
        'subcategory_id',
        'location_id',
        'item_name',
        'part_number',
        'compatible_models',
        'purchase_price',
        'selling_price',
        'stock_quantity'
    ];

    // Relationships
    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function location()
    {
        return $this->belongsTo(Location::class, 'location_id');
    }
}
