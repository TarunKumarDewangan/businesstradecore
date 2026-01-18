<?php

namespace App\Services;

use App\Models\StockLog;
use App\Models\Item;
use Illuminate\Support\Facades\Auth;

class StockService
{
    /**
     * Update Stock & Log History
     * NOTE the "static" keyword here.
     */
    public static function update($itemId, $quantity, $reason)
    {
        $item = Item::find($itemId);
        if (!$item)
            return;

        $user = Auth::user();

        // 1. Update Actual Stock
        $item->stock_quantity += $quantity;
        $item->save();

        // 2. Log History
        StockLog::create([
            'shop_id' => $item->shop_id,
            'item_id' => $item->id,
            'user_id' => $user ? $user->id : null,
            'type' => $quantity > 0 ? 'in' : 'out',
            'quantity' => abs($quantity),
            'balance_after' => $item->stock_quantity,
            'reason' => $reason
        ]);
    }
}
