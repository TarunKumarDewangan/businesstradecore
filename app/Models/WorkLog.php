<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkLog extends Model
{
    use HasFactory;
    protected $fillable = ['shop_id', 'user_id', 'date', 'title', 'description'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
