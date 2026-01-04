<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

// IMPORTS ARE CRITICAL
use App\Models\Invoice;
use App\Models\Item;
use App\Models\RetailerDetail;
use App\Models\Attendance;
use App\Models\Order;          // <--- Was Missing
use App\Models\ReturnRequest;  // <--- Was Missing



class DashboardController extends Controller
{
    // 1. Full Dashboard Stats
    public function getStats()
    {
        $user = Auth::user();
        $shopId = $user->shop_id;
        $today = now()->format('Y-m-d');

        // 1. Gross Sales (Invoices Generated)
        $todayGross = Invoice::where('shop_id', $shopId)->whereDate('created_at', $today)->sum('grand_total');
        $monthGross = Invoice::where('shop_id', $shopId)->whereMonth('created_at', now()->month)->sum('grand_total');

        // 2. Returns (Money Credited back to Retailers)
        // We look for transactions of type 'credit' that involve a Return
        $todayReturns = \App\Models\Transaction::where('shop_id', $shopId)
            ->where('type', 'credit')
            ->where('description', 'LIKE', 'Return%') // Matches "Return Approved..."
            ->whereDate('created_at', $today)
            ->sum('amount');

        $monthReturns = \App\Models\Transaction::where('shop_id', $shopId)
            ->where('type', 'credit')
            ->where('description', 'LIKE', 'Return%')
            ->whereMonth('created_at', now()->month)
            ->sum('amount');

        // 3. Net Sales (Gross - Returns)
        $todayNet = $todayGross - $todayReturns;
        $monthNet = $monthGross - $monthReturns;

        // 4. Other Stats
        $lowStockCount = Item::where('shop_id', $shopId)->where('stock_quantity', '<', 5)->count();
        $totalCredit = RetailerDetail::where('shop_id', $shopId)->sum('current_balance');
        $staffPresent = Attendance::where('shop_id', $shopId)->where('date', $today)->count();

        $pendingOrders = \App\Models\Order::where('shop_id', $shopId)->where('status', 'pending')->count();
        $pendingReturns = \App\Models\ReturnRequest::where('shop_id', $shopId)->where('status', 'pending')->count();

        $recentInvoices = Invoice::where('shop_id', $shopId)->with('customer:id,name')->orderBy('id', 'desc')->limit(5)->get();

        return response()->json([
            'status' => true,
            'data' => [
                'today_sale' => $todayNet,      // Sending NET amount
                'month_sale' => $monthNet,      // Sending NET amount
                'month_returns' => $monthReturns, // NEW DATA
                'low_stock' => $lowStockCount,
                'total_credit' => $totalCredit,
                'staff_present' => $staffPresent,
                'recent_invoices' => $recentInvoices,
                'pending_orders' => $pendingOrders,
                'pending_returns' => $pendingReturns
            ]
        ]);
    }

    // 2. Lightweight Counts (For Sidebar Badges)
    public function getCounts()
    {
        $user = Auth::user();
        $shopId = $user->shop_id;

        $orders = Order::where('shop_id', $shopId)->where('status', 'pending')->count();
        $returns = ReturnRequest::where('shop_id', $shopId)->where('status', 'pending')->count();

        return response()->json([
            'status' => true,
            'orders' => $orders,
            'returns' => $returns
        ]);
    }
}
