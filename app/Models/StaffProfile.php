<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StaffProfile extends Model
{
    use HasFactory;
    protected $fillable = ['user_id', 'shop_id', 'designation', 'salary', 'joining_date', 'address'];
}
