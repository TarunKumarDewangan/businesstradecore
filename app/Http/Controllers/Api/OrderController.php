<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Item;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\RetailerDetail;
use App\Models\Transaction;
use App\Models\DeliveryPartner;
use App\Services\StockService; // Import Service

class OrderController extends Controller
{
    // ================= RETAILER ACTIONS =================

    // 1. Get Catalog (Retailer View)
    public function getCatalog(Request $request)
    {
        $user = Auth::user();

        $query = Item::where('shop_id', $user->shop_id)
            ->select('id', 'item_name', 'part_number', 'category_id', 'selling_price', 'stock_quantity', 'compatible_models')
            // Removed: ->where('stock_quantity', '>', 0)
            ->with('category:id,name');

        // Optional: Add Search on Backend too
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where('item_name', 'LIKE', "%{$search}%")
                ->orWhere('part_number', 'LIKE', "%{$search}%");
        }

        $items = $query->orderBy('item_name')->paginate(20);

        return response()->json(['status' => true, 'data' => $items]);
    }

    // 2. Place an Order
    public function placeOrder(Request $request)
    {
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|exists:items,id',
            'items.*.quantity' => 'required|integer|min:1'
        ]);

        $user = Auth::user();

        try {
            DB::beginTransaction();

            $ordNum = 'ORD-' . strtoupper(substr(uniqid(), -6));

            $order = Order::create([
                'shop_id' => $user->shop_id,
                'retailer_id' => $user->id,
                'order_number' => $ordNum,
                'status' => 'pending'
            ]);

            foreach ($request->items as $cartItem) {
                $dbItem = Item::find($cartItem['id']);
                OrderItem::create([
                    'order_id' => $order->id,
                    'item_id' => $dbItem->id,
                    'requested_qty' => $cartItem['quantity'],
                    'unit_price' => $dbItem->selling_price
                ]);
            }

            DB::commit();
            return response()->json(['status' => true, 'message' => 'Order Placed Successfully!', 'order_id' => $order->order_number]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // 3. View My Orders
    // 3. Retailer: View My Orders
    public function myOrders()
    {
        $user = Auth::user();
        $orders = Order::where('retailer_id', $user->id)
            // ADDED 'returnRequests' HERE
            ->with(['items.item', 'returnRequests'])
            ->orderBy('id', 'desc')
            ->paginate(10);

        return response()->json(['status' => true, 'data' => $orders]);
    }

    // ================= MASTER ACTIONS =================

    // 4. View Incoming Orders (With Filter)
    public function incomingOrders(Request $request)
    {
        $user = Auth::user();
        $query = Order::where('shop_id', $user->shop_id)
            ->with(['retailer:id,name,phone', 'items.item']);

        // FILTER LOGIC
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $orders = $query->orderBy('id', 'desc')->paginate(20);
        return response()->json(['status' => true, 'data' => $orders]);
    }

    // 5. Dispatch Order (Logs Stock)
    // 5. Dispatch Order (Updated Logic: Handle 0 Qty)
    public function dispatchOrder(Request $request, $id)
    {
        $request->validate([
            'items' => 'required|array',
            'delivery_type' => 'required',
            'driver_id' => 'required'
        ]);

        $user = Auth::user();

        try {
            DB::beginTransaction();

            $order = Order::where('id', $id)->where('shop_id', $user->shop_id)->firstOrFail();

            if ($order->status !== 'pending')
                throw new \Exception("Order is already processed");

            $totalAmount = 0;
            $invoiceItemsData = [];
            $hasShippableItems = false; // Flag to check if ANY item is being sent

            foreach ($request->items as $itemData) {
                $orderItem = OrderItem::where('order_id', $order->id)->where('item_id', $itemData['item_id'])->first();

                if ($orderItem) {
                    $qty = (int) $itemData['fulfilled_qty'];
                    $orderItem->fulfilled_qty = $qty;
                    $orderItem->save();

                    // === CORE LOGIC CHANGE: Only process if QTY > 0 ===
                    if ($qty > 0) {
                        $hasShippableItems = true;

                        $dbItem = Item::find($orderItem->item_id);
                        if ($dbItem->stock_quantity < $qty) {
                            throw new \Exception("Insufficient stock for " . $dbItem->item_name);
                        }

                        // Deduct Stock
                        StockService::update($dbItem->id, -$qty, "Order Dispatched #" . $order->order_number);

                        // Calc Cost
                        $lineTotal = $orderItem->unit_price * $qty;
                        $totalAmount += $lineTotal;

                        // Prep Invoice Item
                        $invoiceItemsData[] = [
                            'item_id' => $dbItem->id,
                            'item_name' => $dbItem->item_name,
                            'quantity' => $qty,
                            'unit_price' => $orderItem->unit_price,
                            'total_price' => $lineTotal
                        ];
                    }
                }
            }

            // If Master sets all items to 0, maybe Cancel the order or Reject it instead?
            // But let's proceed. It creates an Empty Invoice (Value 0).
            // Actually, best to BLOCK dispatch if total 0.

            if (!$hasShippableItems) {
                throw new \Exception("Cannot Dispatch empty order! Please Reject instead.");
            }

            // Generate Invoice
            $invNum = 'INV-' . strtoupper(substr(uniqid(), -8));
            $invoice = Invoice::create([
                'shop_id' => $user->shop_id,
                'customer_id' => $order->retailer_id,
                'customer_name' => $order->retailer->name,
                'customer_phone' => $order->retailer->phone,
                'invoice_number' => $invNum,
                'total_amount' => $totalAmount,
                'discount' => 0,
                'grand_total' => $totalAmount,
                'paid_amount' => 0,
                'payment_mode' => 'credit'
            ]);

            foreach ($invoiceItemsData as $data) {
                $data['invoice_id'] = $invoice->id;
                InvoiceItem::create($data);
            }

            // Ledger Update
            $retailerDetail = RetailerDetail::where('user_id', $order->retailer_id)->first();
            if ($retailerDetail) {
                $retailerDetail->current_balance += $totalAmount;
                $retailerDetail->save();
                Transaction::create([
                    'shop_id' => $user->shop_id,
                    'user_id' => $order->retailer_id,
                    'type' => 'debit',
                    'amount' => $totalAmount,
                    'description' => 'Order ' . $order->order_number,
                    'reference_id' => $invoice->id,
                    'balance_after' => $retailerDetail->current_balance,
                    'date' => now()
                ]);
            }

            // Update Status
            $driverName = 'Unknown';
            $vehicleDetails = null;
            if ($request->delivery_type === 'partner') {
                $p = DeliveryPartner::find($request->driver_id);
                if ($p) {
                    $driverName = $p->name;
                    $vehicleDetails = $p->vehicle_number;
                }
            } elseif ($request->delivery_type === 'staff') {
                $u = \App\Models\User::find($request->driver_id);
                if ($u) {
                    $driverName = $u->name . ' (Staff)';
                    $vehicleDetails = 'Shop Vehicle';
                }
            }

            $order->update([
                'status' => 'dispatched',
                'invoice_id' => $invoice->id,
                'delivery_type' => $request->delivery_type,
                'driver_id' => $request->driver_id,
                'driver_name' => $driverName,
                'vehicle_details' => $vehicleDetails
            ]);

            DB::commit();
            return response()->json(['status' => true, 'message' => 'Order Dispatched & Billed!']);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ... (Cancel & Update Order functions remain same as they don't affect stock yet) ...
    public function cancelOrder($id)
    {
        $user = Auth::user();
        $order = Order::where('id', $id)->where('retailer_id', $user->id)->firstOrFail();
        if ($order->status !== 'pending')
            return response()->json(['status' => false, 'message' => 'Cannot cancel'], 400);
        $order->delete();
        return response()->json(['status' => true, 'message' => 'Order Cancelled']);
    }

    public function updateOrder(Request $request, $id)
    {
        $request->validate(['items' => 'required|array']);
        $user = Auth::user();
        $order = Order::where('id', $id)->where('retailer_id', $user->id)->firstOrFail();
        if ($order->status !== 'pending')
            return response()->json(['status' => false, 'message' => 'Cannot modify'], 400);
        try {
            DB::beginTransaction();
            foreach ($request->items as $itemData) {
                if ($itemData['quantity'] <= 0)
                    OrderItem::where('order_id', $order->id)->where('item_id', $itemData['item_id'])->delete();
                else
                    OrderItem::where('order_id', $order->id)->where('item_id', $itemData['item_id'])->update(['requested_qty' => $itemData['quantity']]);
            }
            if ($order->items()->count() == 0) {
                $order->delete();
                DB::commit();
                return response()->json(['status' => true, 'message' => 'Order empty, deleted.']);
            }
            DB::commit();
            return response()->json(['status' => true, 'message' => 'Order Updated']);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // 6. Manual Order
    public function createOrderManual(Request $request)
    {
        // ... (Same as before, no stock change here) ...
        // I will include this for completeness if you copy-paste the whole file
        $request->validate([
            'retailer_id' => 'required|exists:users,id',
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|exists:items,id',
            'items.*.quantity' => 'required|integer|min:1'
        ]);
        $user = Auth::user();
        try {
            DB::beginTransaction();
            $ordNum = 'ORD-' . strtoupper(substr(uniqid(), -6));
            $order = Order::create(['shop_id' => $user->shop_id, 'retailer_id' => $request->retailer_id, 'order_number' => $ordNum, 'status' => 'pending']);
            foreach ($request->items as $cartItem) {
                $dbItem = Item::find($cartItem['id']);
                OrderItem::create(['order_id' => $order->id, 'item_id' => $dbItem->id, 'requested_qty' => $cartItem['quantity'], 'unit_price' => $dbItem->selling_price]);
            }
            DB::commit();
            return response()->json(['status' => true, 'message' => 'Manual Order Created!', 'order_number' => $ordNum]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function rejectOrder($id)
    {
        $user = Auth::user();
        $order = Order::where('id', $id)->where('shop_id', $user->shop_id)->firstOrFail();

        if ($order->status !== 'pending')
            return response()->json(['status' => false, 'message' => 'Only pending orders can be rejected'], 400);

        $order->status = 'cancelled'; // We use 'cancelled' as rejected status
        $order->save();

        return response()->json(['status' => true, 'message' => 'Order Rejected']);
    }

    // 8. Master: Restore Order (Rejected -> Pending)
    public function restoreOrder($id)
    {
        $user = Auth::user();
        $order = Order::where('id', $id)->where('shop_id', $user->shop_id)->firstOrFail();

        if ($order->status !== 'cancelled')
            return response()->json(['status' => false, 'message' => 'Only rejected orders can be restored'], 400);

        $order->status = 'pending';
        $order->save();

        return response()->json(['status' => true, 'message' => 'Order Restored to Pending']);
    }

    // 9. Master: Mark Delivered
    public function markDelivered($id)
    {
        $user = Auth::user();
        $order = Order::where('id', $id)->where('shop_id', $user->shop_id)->firstOrFail();

        if ($order->status !== 'dispatched')
            return response()->json(['status' => false, 'message' => 'Only dispatched orders can be delivered'], 400);

        $order->status = 'delivered';
        $order->save();

        return response()->json(['status' => true, 'message' => 'Order Marked as Delivered!']);
    }
    // 10. Master: Revert Delivery (Delivered -> Dispatched)
    public function revertDelivery($id)
    {
        $user = Auth::user();
        $order = Order::where('id', $id)->where('shop_id', $user->shop_id)->firstOrFail();

        if ($order->status !== 'delivered') {
            return response()->json(['status' => false, 'message' => 'Order is not marked as delivered'], 400);
        }

        $order->status = 'dispatched';
        $order->save();

        return response()->json(['status' => true, 'message' => 'Order Reverted to Dispatched']);
    }

    // 11. Master: Cancel Dispatch (Dispatched -> Pending + Full Rollback)
    public function cancelDispatch($id)
    {
        $user = Auth::user();
        $order = Order::where('id', $id)->where('shop_id', $user->shop_id)->firstOrFail();

        if ($order->status !== 'dispatched') {
            return response()->json(['status' => false, 'message' => 'Order must be in Dispatched state to reset'], 400);
        }

        if (!$order->invoice_id) {
            // Safety fallback if no invoice linked
            $order->status = 'pending';
            $order->save();
            return response()->json(['status' => true, 'message' => 'Order Reset to Pending (No Invoice found)']);
        }

        try {
            DB::beginTransaction();

            $invoice = Invoice::find($order->invoice_id);

            // A. Rollback Stock & Log History
            if ($invoice) {
                foreach ($invoice->items as $item) {
                    // Add back stock
                    \App\Services\StockService::update($item->item_id, $item->quantity, "Order Reset #" . $order->order_number);
                }

                // B. Reverse Ledger
                if ($invoice->customer_id) {
                    $retailer = RetailerDetail::where('user_id', $invoice->customer_id)->first();
                    if ($retailer) {
                        // We remove the grand total from their debt
                        $retailer->current_balance -= $invoice->grand_total;
                        $retailer->save();

                        // Log Credit Note
                        Transaction::create([
                            'shop_id' => $user->shop_id,
                            'user_id' => $invoice->customer_id,
                            'type' => 'credit',
                            'amount' => $invoice->grand_total,
                            'description' => 'Order Reset (System Auto)',
                            'reference_id' => $invoice->id,
                            'balance_after' => $retailer->current_balance,
                            'date' => now()
                        ]);
                    }
                }

                // Delete Invoice
                $invoice->delete();
            }

            // C. Reset Order
            $order->update([
                'status' => 'pending',
                'invoice_id' => null,
                'delivery_type' => null,
                'driver_id' => null,
                'driver_name' => null
            ]);

            DB::commit();
            return response()->json(['status' => true, 'message' => 'Dispatch Cancelled. Stock Restored. Order is Pending.']);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }
    // 6. Retailer: Mark Order as Received
    public function markReceived($id)
    {
        $user = Auth::user();
        $order = Order::where('id', $id)->where('retailer_id', $user->id)->firstOrFail();

        if ($order->status !== 'dispatched') {
            return response()->json(['status' => false, 'message' => 'Order must be Dispatched first'], 400);
        }

        $order->status = 'delivered';
        $order->save();

        return response()->json(['status' => true, 'message' => 'Order Marked as Received!']);
    }
}
