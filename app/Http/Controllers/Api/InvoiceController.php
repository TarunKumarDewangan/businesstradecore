<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Item;
use App\Models\RetailerDetail;
use App\Models\Transaction;
use App\Services\StockService; // Import Service
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
    /**
     * 1. Create New Invoice (Full Logic)
     */
    public function store(Request $request)
    {
        $request->validate([
            'items' => 'required|array|min:1',
            'paid_amount' => 'required|numeric|min:0',
            'customer_phone' => 'required_if:customer_type,walkin',
        ]);

        $user = Auth::user();

        try {
            DB::beginTransaction();

            // A. Customer Resolution
            $customerId = null;
            $customerName = $request->customer_name;
            $customerPhone = $request->customer_phone;

            if ($request->customer_type === 'retailer') {
                $customerId = $request->customer_id;
            } else {
                if ($customerPhone) {
                    $existingUser = \App\Models\User::where('phone', $customerPhone)->first();
                    if ($existingUser) {
                        $customerId = $existingUser->id;
                        $customerName = $existingUser->name;
                    } else {
                        $newUser = \App\Models\User::create([
                            'name' => $request->customer_name ?? 'Walk-in Customer',
                            'phone' => $customerPhone,
                            'password' => \Illuminate\Support\Facades\Hash::make('123456'),
                            'role_id' => 5,
                            'shop_id' => $user->shop_id,
                            'status' => 'active'
                        ]);
                        \App\Models\RetailerDetail::create([
                            'user_id' => $newUser->id,
                            'shop_id' => $user->shop_id,
                            'customer_type' => 'walkin',
                            'retailer_shop_name' => $request->customer_name,
                            'credit_limit' => 0
                        ]);
                        $customerId = $newUser->id;
                    }
                }
            }

            // B. Generate Invoice
            $invNum = 'INV-' . strtoupper(substr(uniqid(), -8));

            // C. Stock & Totals Calculation
            $totalAmount = 0;
            $invoiceItemsData = [];

            foreach ($request->items as $cartItem) {
                $dbItem = Item::where('id', $cartItem['id'])->lockForUpdate()->first();

                if ($dbItem->stock_quantity < $cartItem['quantity']) {
                    throw new \Exception("Insufficient stock for: " . $dbItem->item_name);
                }

                // USE SERVICE TO DEDUCT STOCK
                StockService::update($dbItem->id, -($cartItem['quantity']), "Invoice " . $invNum);

                $lineTotal = $dbItem->selling_price * $cartItem['quantity'];
                $totalAmount += $lineTotal;

                $invoiceItemsData[] = [
                    'item_id' => $dbItem->id,
                    'item_name' => $dbItem->item_name,
                    'quantity' => $cartItem['quantity'],
                    'unit_price' => $dbItem->selling_price,
                    'total_price' => $lineTotal
                ];
            }

            // D. Create Invoice Record
            $discount = $request->discount ?? 0;
            $grandTotal = $totalAmount - $discount;

            $invoice = Invoice::create([
                'shop_id' => $user->shop_id,
                'customer_id' => $customerId,
                'customer_name' => $customerName,
                'customer_phone' => $customerPhone,
                'invoice_number' => $invNum,
                'total_amount' => $totalAmount,
                'discount' => $discount,
                'grand_total' => $grandTotal,
                'paid_amount' => $request->paid_amount,
                'payment_mode' => $request->payment_mode
            ]);

            foreach ($invoiceItemsData as $data) {
                $data['invoice_id'] = $invoice->id;
                InvoiceItem::create($data);
            }

            // E. Ledger Management
            if ($customerId) {
                $retailer = RetailerDetail::where('user_id', $customerId)->first();
                if ($retailer) {
                    $retailer->current_balance = $retailer->current_balance + $grandTotal - $request->paid_amount;
                    $retailer->save();

                    $balBeforePayment = $retailer->current_balance + $request->paid_amount;
                    Transaction::create([
                        'shop_id' => $user->shop_id,
                        'user_id' => $customerId,
                        'type' => 'debit',
                        'amount' => $grandTotal,
                        'description' => 'Invoice ' . $invNum . ' (Sale)',
                        'reference_id' => $invoice->id,
                        'balance_after' => $balBeforePayment,
                        'date' => now()
                    ]);

                    if ($request->paid_amount > 0) {
                        Transaction::create([
                            'shop_id' => $user->shop_id,
                            'user_id' => $customerId,
                            'type' => 'credit',
                            'amount' => $request->paid_amount,
                            'description' => 'Payment for ' . $invNum . ' (' . ucfirst($request->payment_mode) . ')',
                            'reference_id' => $invoice->id,
                            'balance_after' => $retailer->current_balance,
                            'date' => now()
                        ]);
                    }
                }
            }

            DB::commit();
            return response()->json(['status' => true, 'message' => 'Invoice Created!', 'invoice_id' => $invoice->id]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * 2. List Invoices
     */
    // 2. List Invoices
    public function index(Request $request)
    {
        $user = Auth::user();

        // Start Query
        $query = Invoice::where('shop_id', $user->shop_id)
            ->with(['items', 'customer.retailerDetail']); // Load relationships

        // Search Filter
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'LIKE', "%{$search}%")
                    ->orWhere('customer_name', 'LIKE', "%{$search}%")
                    ->orWhere('customer_phone', 'LIKE', "%{$search}%")
                    // Search inside linked customer (User table)
                    ->orWhereHas('customer', function ($q2) use ($search) {
                        $q2->where('name', 'LIKE', "%{$search}%")
                            ->orWhere('phone', 'LIKE', "%{$search}%");
                    });
            });
        }

        // Get Paginated Results
        $invoices = $query->orderBy('id', 'desc')->paginate(20);

        return response()->json(['status' => true, 'data' => $invoices]);
    }

    /**
     * 3. Update Invoice (Edit Bill)
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        try {
            DB::beginTransaction();

            $invoice = Invoice::where('id', $id)->where('shop_id', $user->shop_id)->firstOrFail();

            // A. Rollback Stock & Ledger
            foreach ($invoice->items as $oldItem) {
                // USE SERVICE (Add back positive)
                StockService::update($oldItem->item_id, $oldItem->quantity, "Edit Invoice Restock #" . $invoice->invoice_number);
            }
            $invoice->items()->delete();

            if ($invoice->customer_id) {
                $oldRetailer = RetailerDetail::where('user_id', $invoice->customer_id)->first();
                if ($oldRetailer) {
                    $prevImpact = $invoice->grand_total - $invoice->paid_amount;
                    $oldRetailer->current_balance -= $prevImpact;
                    $oldRetailer->save();
                    Transaction::where('reference_id', $invoice->id)->delete();
                }
            }

            // B. Process New Data (Similar to Store)
            $customerId = null;
            $customerName = $request->customer_name;
            $customerPhone = $request->customer_phone;

            if ($request->customer_type === 'retailer') {
                $customerId = $request->customer_id;
            } else if ($customerPhone) {
                $u = \App\Models\User::where('phone', $customerPhone)->first();
                if ($u) {
                    $customerId = $u->id;
                    $customerName = $u->name;
                }
            }

            $totalAmount = 0;
            foreach ($request->items as $cartItem) {
                $dbItem = Item::where('id', $cartItem['id'])->lockForUpdate()->first();
                if ($dbItem->stock_quantity < $cartItem['quantity'])
                    throw new \Exception("Insufficient stock: " . $dbItem->item_name);

                // USE SERVICE (Deduct)
                StockService::update($dbItem->id, -($cartItem['quantity']), "Invoice Updated #" . $invoice->invoice_number);

                $lineTotal = $dbItem->selling_price * $cartItem['quantity'];
                $totalAmount += $lineTotal;

                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'item_id' => $dbItem->id,
                    'item_name' => $dbItem->item_name,
                    'quantity' => $cartItem['quantity'],
                    'unit_price' => $dbItem->selling_price,
                    'total_price' => $lineTotal
                ]);
            }

            $discount = $request->discount ?? 0;
            $grandTotal = $totalAmount - $discount;

            $invoice->update([
                'customer_id' => $customerId,
                'customer_name' => $customerName,
                'customer_phone' => $customerPhone,
                'total_amount' => $totalAmount,
                'discount' => $discount,
                'grand_total' => $grandTotal,
                'paid_amount' => $request->paid_amount,
                'payment_mode' => $request->payment_mode
            ]);

            if ($customerId) {
                $retailer = RetailerDetail::where('user_id', $customerId)->first();
                if ($retailer) {
                    $retailer->current_balance += ($grandTotal - $request->paid_amount);
                    $retailer->save();

                    Transaction::create([
                        'shop_id' => $user->shop_id,
                        'user_id' => $customerId,
                        'type' => 'debit',
                        'amount' => $grandTotal,
                        'description' => 'Invoice ' . $invoice->invoice_number . ' (Updated)',
                        'reference_id' => $invoice->id,
                        'balance_after' => $retailer->current_balance + $request->paid_amount,
                        'date' => now()
                    ]);
                    if ($request->paid_amount > 0) {
                        Transaction::create([
                            'shop_id' => $user->shop_id,
                            'user_id' => $customerId,
                            'type' => 'credit',
                            'amount' => $request->paid_amount,
                            'description' => 'Payment Updated',
                            'reference_id' => $invoice->id,
                            'balance_after' => $retailer->current_balance,
                            'date' => now()
                        ]);
                    }
                }
            }

            DB::commit();
            return response()->json(['status' => true, 'message' => 'Invoice Updated Successfully!']);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * 4. Delete Invoice (Rollback Stock & Ledger)
     */
    public function destroy($id)
    {
        $user = Auth::user();
        try {
            DB::beginTransaction();

            $invoice = Invoice::where('id', $id)->where('shop_id', $user->shop_id)->firstOrFail();

            // A. Rollback Stock
            foreach ($invoice->items as $item) {
                // USE SERVICE (Add Back)
                StockService::update($item->item_id, $item->quantity, "Invoice Cancelled #" . $invoice->invoice_number);
            }

            // B. Rollback Ledger
            if ($invoice->customer_id) {
                $retailer = RetailerDetail::where('user_id', $invoice->customer_id)->first();
                if ($retailer) {
                    $balanceToReduce = $invoice->grand_total - $invoice->paid_amount;
                    if ($balanceToReduce > 0) {
                        $retailer->current_balance -= $balanceToReduce;
                        $retailer->save();
                    }
                    Transaction::create([
                        'shop_id' => $user->shop_id,
                        'user_id' => $invoice->customer_id,
                        'type' => 'credit',
                        'amount' => $balanceToReduce,
                        'description' => 'Invoice ' . $invoice->invoice_number . ' Cancelled',
                        'reference_id' => $invoice->id,
                        'balance_after' => $retailer->current_balance,
                        'date' => now()
                    ]);
                }
            }

            $invoice->delete();
            DB::commit();
            return response()->json(['status' => true, 'message' => 'Invoice Cancelled & Stock Restored']);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
