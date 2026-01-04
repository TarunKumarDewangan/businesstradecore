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

class OrderController extends Controller
{
    // ================= RETAILER ACTIONS =================

    // 1. Get Catalog (Items available for B2B)
    public function getCatalog(Request $request)
    {
        // We need to find the Shop ID.
        // Since Retailer is logged in, their 'shop_id' links to the Master's shop.
        $user = Auth::user();

        $items = Item::where('shop_id', $user->shop_id)
            ->select('id', 'item_name', 'part_number', 'category_id', 'selling_price', 'stock_quantity', 'compatible_models')
            // IMPORTANT: We do NOT select 'purchase_price' to keep it secret.
            ->where('stock_quantity', '>', 0) // Only show in-stock items? Optional.
            ->with('category:id,name')
            ->orderBy('item_name')
            ->paginate(20);

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

            // Generate Order Number
            $ordNum = 'ORD-' . strtoupper(substr(uniqid(), -6));

            // Create Order Header
            $order = Order::create([
                'shop_id' => $user->shop_id,
                'retailer_id' => $user->id,
                'order_number' => $ordNum,
                'status' => 'pending'
            ]);

            // Add Items
            foreach ($request->items as $cartItem) {
                $dbItem = Item::find($cartItem['id']);

                OrderItem::create([
                    'order_id' => $order->id,
                    'item_id' => $dbItem->id,
                    'requested_qty' => $cartItem['quantity'],
                    'unit_price' => $dbItem->selling_price // Snapshot of price at that moment
                ]);
            }

            DB::commit();
            return response()->json(['status' => true, 'message' => 'Order Placed Successfully!', 'order_id' => $order->order_number]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // 3. Retailer: View My Orders
    public function myOrders()
    {
        $user = Auth::user();
        $orders = Order::where('retailer_id', $user->id)
            ->with('items.item') // Load items inside order
            ->orderBy('id', 'desc')
            ->paginate(10);

        return response()->json(['status' => true, 'data' => $orders]);
    }

    // ================= MASTER ACTIONS =================

    // 4. Master: View All Incoming Orders
    public function incomingOrders()
    {
        $user = Auth::user();
        $orders = Order::where('shop_id', $user->shop_id)
            ->with(['retailer:id,name,phone', 'items.item'])
            ->orderBy('id', 'desc')
            ->paginate(20);

        return response()->json(['status' => true, 'data' => $orders]);
    }
    public function dispatchOrder(Request $request, $id)
    {
        $request->validate([
            'items' => 'required|array', // List of { item_id, fulfilled_qty }
            'delivery_type' => 'required',
            'driver_id' => 'required'
        ]);

        $user = Auth::user();

        try {
            DB::beginTransaction();

            $order = Order::where('id', $id)->where('shop_id', $user->shop_id)->firstOrFail();

            if ($order->status !== 'pending') {
                throw new \Exception("Order is already processed");
            }

            // 1. Calculate Totals & Deduct Stock
            $totalAmount = 0;
            $invoiceItemsData = [];

            foreach ($request->items as $itemData) {
                $orderItem = OrderItem::where('order_id', $order->id)
                    ->where('item_id', $itemData['item_id'])
                    ->first();

                if ($orderItem) {
                    $qty = $itemData['fulfilled_qty'];

                    // Update Order Item
                    $orderItem->fulfilled_qty = $qty;
                    $orderItem->save();

                    if ($qty > 0) {
                        // Deduct Stock
                        $dbItem = Item::find($orderItem->item_id);
                        if ($dbItem->stock_quantity < $qty) {
                            throw new \Exception("Insufficient stock for " . $dbItem->item_name);
                        }
                        $dbItem->stock_quantity -= $qty;
                        $dbItem->save();

                        // Prepare Invoice Data
                        $lineTotal = $orderItem->unit_price * $qty;
                        $totalAmount += $lineTotal;

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

            // 2. Generate Invoice
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
                'paid_amount' => 0, // B2B is usually full credit initially
                'payment_mode' => 'credit'
            ]);

            // Save Invoice Items
            foreach ($invoiceItemsData as $data) {
                $data['invoice_id'] = $invoice->id;
                InvoiceItem::create($data);
            }

            // 3. Update Ledger (Debit the Retailer)
            $retailerDetail = RetailerDetail::where('user_id', $order->retailer_id)->first();
            if ($retailerDetail) {
                $retailerDetail->current_balance += $totalAmount;
                $retailerDetail->save();

                Transaction::create([
                    'shop_id' => $user->shop_id,
                    'user_id' => $order->retailer_id,
                    'type' => 'debit',
                    'amount' => $totalAmount,
                    'description' => 'Order ' . $order->order_number . ' (Invoice generated)',
                    'reference_id' => $invoice->id,
                    'balance_after' => $retailerDetail->current_balance,
                    'date' => now()
                ]);
            }

            // 4. Update Order Status
            $driverName = 'Unknown';
            $vehicleDetails = null;

            if ($request->delivery_type === 'partner') {
                $p = DeliveryPartner::find($request->driver_id);
                if ($p) {
                    $driverName = $p->name;
                    $vehicleDetails = $p->vehicle_number;
                }
            } elseif ($request->delivery_type === 'staff') {
                // If Staff, find in Users table
                $u = \App\Models\User::find($request->driver_id);
                if ($u) {
                    $driverName = $u->name . ' (Staff)';
                    $vehicleDetails = 'Shop Vehicle'; // Or leave null
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
}
