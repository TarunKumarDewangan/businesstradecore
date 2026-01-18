<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ReturnRequest;
use App\Models\Item;
use App\Models\RetailerDetail;
use App\Models\Transaction;
use App\Models\OrderItem;
use App\Services\StockService; // Import Service
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ReturnController extends Controller
{
    // ... (Store and Index functions remain same) ...
    public function store(Request $request)
    {
        $request->validate(['order_id' => 'required', 'item_id' => 'required', 'quantity' => 'required|integer|min:1', 'reason' => 'required']);
        $user = Auth::user();
        $orderItem = OrderItem::where('order_id', $request->order_id)->where('item_id', $request->item_id)->first();
        if (!$orderItem || $orderItem->fulfilled_qty < $request->quantity)
            return response()->json(['status' => false, 'message' => 'Invalid quantity'], 400);
        ReturnRequest::create([
            'shop_id' => $user->shop_id,
            'retailer_id' => $user->id,
            'order_id' => $request->order_id,
            'item_id' => $request->item_id,
            'quantity' => $request->quantity,
            'reason' => $request->reason,
            'status' => 'pending'
        ]);
        return response()->json(['status' => true, 'message' => 'Return Request Submitted']);
    }

    public function index()
    {
        $user = Auth::user();
        $returns = ReturnRequest::where('shop_id', $user->shop_id)->with(['retailer', 'item'])->orderBy('id', 'desc')->paginate(20);
        return response()->json(['status' => true, 'data' => $returns]);
    }

    // 3. Approve Return (Logs Stock)
    public function approve(Request $request, $id)
    {
        $request->validate(['action' => 'required|in:approve,reject']);
        $user = Auth::user();

        try {
            DB::beginTransaction();

            $returnReq = ReturnRequest::where('id', $id)->where('shop_id', $user->shop_id)->firstOrFail();
            if ($returnReq->status !== 'pending')
                return response()->json(['status' => false, 'message' => 'Already processed']);

            if ($request->action === 'reject') {
                $returnReq->status = 'rejected';
                $returnReq->save();
                DB::commit();
                return response()->json(['status' => true, 'message' => 'Return Rejected']);
            }

            // Approve Logic
            $orderItem = OrderItem::where('order_id', $returnReq->order_id)->where('item_id', $returnReq->item_id)->first();
            $refundAmount = $orderItem->unit_price * $returnReq->quantity;

            // Update Ledger
            $retailer = RetailerDetail::where('user_id', $returnReq->retailer_id)->first();
            $retailer->current_balance -= $refundAmount;
            $retailer->save();

            $txn = Transaction::create([
                'shop_id' => $user->shop_id,
                'user_id' => $returnReq->retailer_id,
                'type' => 'credit',
                'amount' => $refundAmount,
                'description' => 'Return Approved (Item: ' . $returnReq->item->item_name . ')',
                'balance_after' => $retailer->current_balance,
                'date' => now()
            ]);

            // Update Stock & Log History
            if ($request->restock === true) {
                // USE SERVICE (Add Stock)
                StockService::update($returnReq->item_id, $returnReq->quantity, "Return Approved #" . $returnReq->order_id);
            }

            $order = \App\Models\Order::find($returnReq->order_id);
            if ($order) {
                $order->status = 'returned';
                $order->save();
            }

            $returnReq->status = 'approved';
            $returnReq->transaction_id = $txn->id;
            $returnReq->save();

            DB::commit();
            return response()->json(['status' => true, 'message' => 'Return Approved & Credited']);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
