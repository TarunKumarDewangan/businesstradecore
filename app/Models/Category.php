<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory;

    protected $fillable = ['shop_id', 'name', 'type', 'parent_id', 'is_active'];

    // Relationship: A Main Category has many Sub Categories
    public function subcategories()
    {
        return $this->hasMany(Category::class, 'parent_id');
    }
}
