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
    // 1. Retailer: Request a Return
    public function store(Request $request)
    {
        $request->validate([
            'order_id' => 'required|exists:orders,id',
            'item_id' => 'required|exists:items,id',
            'quantity' => 'required|integer|min:1',
            'reason' => 'required'
        ]);

        $user = Auth::user();

        // Verify Item exists in Order
        $orderItem = OrderItem::where('order_id', $request->order_id)
            ->where('item_id', $request->item_id)
            ->first();

        if (!$orderItem || $orderItem->fulfilled_qty < $request->quantity) {
            return response()->json(['status' => false, 'message' => 'Invalid quantity'], 400);
        }

        ReturnRequest::create([
            'shop_id' => $user->shop_id,
            'retailer_id' => $user->id,
            'order_id' => $request->order_id,
            'item_id' => $request->item_id,
            'quantity' => $request->quantity,
            'reason' => $request->reason,
            'status' => 'pending',
            'inspection_status' => 'pending' // Initial State
        ]);

        return response()->json(['status' => true, 'message' => 'Return Request Submitted']);
    }

    // 2. Master: View Returns
    public function index()
    {
        $user = Auth::user();
        $returns = ReturnRequest::where('shop_id', $user->shop_id)
            ->with(['retailer', 'item'])
            ->orderBy('id', 'desc')
            ->paginate(20);

        return response()->json(['status' => true, 'data' => $returns]);
    }

    // 3. Approve Credit Note (This function was missing/broken)
    public function approve(Request $request, $id)
    {
        $request->validate(['action' => 'required|in:approve,reject']);
        $user = Auth::user();

        try {
            DB::beginTransaction();

            $returnReq = ReturnRequest::where('id', $id)->where('shop_id', $user->shop_id)->firstOrFail();

            if ($returnReq->status !== 'pending') {
                return response()->json(['status' => false, 'message' => 'Already processed'], 400);
            }

            if ($request->action === 'reject') {
                $returnReq->status = 'rejected';
                $returnReq->save();
                DB::commit();
                return response()->json(['status' => true, 'message' => 'Return Rejected']);
            }

            // APPROVE FLOW (Ledger Only)
            $orderItem = OrderItem::where('order_id', $returnReq->order_id)
                ->where('item_id', $returnReq->item_id)
                ->first();

            // Calculate Value based on original sale price
            $refundAmount = $orderItem->unit_price * $returnReq->quantity;

            $retailer = RetailerDetail::where('user_id', $returnReq->retailer_id)->first();
            if ($retailer) {
                // Reduce Debt
                $retailer->current_balance -= $refundAmount;
                $retailer->save();

                // Log Transaction
                $txn = Transaction::create([
                    'shop_id' => $user->shop_id,
                    'user_id' => $returnReq->retailer_id,
                    'type' => 'credit',
                    'amount' => $refundAmount,
                    'description' => 'Return Approved (Item: ' . $returnReq->item->item_name . ')',
                    'balance_after' => $retailer->current_balance,
                    'date' => now()
                ]);

                // Link transaction
                $returnReq->transaction_id = $txn->id;
            }

            // Mark Order visually as 'returned'
            $order = \App\Models\Order::find($returnReq->order_id);
            if ($order && $order->status !== 'returned') {
                $order->status = 'returned';
                $order->save();
            }

            $returnReq->status = 'approved';
            $returnReq->save();

            DB::commit();
            return response()->json(['status' => true, 'message' => 'Credit Approved. Move to Inspection.']);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // 4. Physical Inspection (Update Stock)
    public function inspect(Request $request, $id)
    {
        $request->validate(['action' => 'required|in:restock,scrap']);
        $user = Auth::user();

        try {
            DB::beginTransaction();

            $returnReq = ReturnRequest::where('id', $id)->where('shop_id', $user->shop_id)->firstOrFail();

            if ($returnReq->status !== 'approved')
                return response()->json(['status' => false, 'message' => 'Must approve financial refund first'], 400);

            // Using !is_null allows NULL or 'pending' to proceed
            if ($returnReq->inspection_status !== 'pending' && !is_null($returnReq->inspection_status)) {
                return response()->json(['status' => false, 'message' => 'Already inspected'], 400);
            }

            $itemId = $returnReq->item_id;

            if ($request->action === 'restock') {
                // A. Restock: Add stock back using Service
                \App\Services\StockService::update(
                    $itemId,
                    $returnReq->quantity,
                    "Return Restocked (Req #" . $returnReq->id . ")"
                );
                $returnReq->inspection_status = 'restocked';

            } else {
                // B. Scrap: Add & Remove to log history, net stock 0 change
                \App\Services\StockService::update(
                    $itemId,
                    $returnReq->quantity,
                    "Return Received (Damage)"
                );
                \App\Services\StockService::update(
                    $itemId,
                    -($returnReq->quantity),
                    "Moved to Scrap/Trash (Req #" . $returnReq->id . ")"
                );
                $returnReq->inspection_status = 'scrapped';
            }

            $returnReq->save();
            DB::commit();
            return response()->json(['status' => true, 'message' => 'Item ' . ucfirst($request->action) . ' Successfully']);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
