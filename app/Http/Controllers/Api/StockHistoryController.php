<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\StockLog;
use Illuminate\Support\Facades\Auth;

class StockHistoryController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = StockLog::where('shop_id', $user->shop_id)
            ->with('item:id,item_name');

        // Filters
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->whereHas('item', function ($q) use ($search) {
                $q->where('item_name', 'LIKE', "%{$search}%");
            });
        }

        if ($request->has('type') && !empty($request->type)) {
            $query->where('type', $request->type);
        }

        $logs = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json(['status' => true, 'data' => $logs]);
    }
}
