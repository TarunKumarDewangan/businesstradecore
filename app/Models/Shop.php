<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Shop extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'shop_name',
        'shop_logo',
        'gst_number',
        'is_active',
        'latitude',
        'longitude',
        'allowed_radius'
    ];

    // Relationship to get the Owner (User with Role 2 or 3 linked to this shop)
    public function owner()
    {
        return $this->hasOne(User::class, 'shop_id')->whereIn('role_id', [2, 3])->latest();
    }
}
