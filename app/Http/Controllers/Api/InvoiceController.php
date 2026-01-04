<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Item;
use App\Models\RetailerDetail;
use App\Models\Transaction;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
    /**
     * 1. Create New Invoice & Handle Stock/Ledger (Full Accounting)
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

            // ==================================================
            // 1. SMART CUSTOMER RESOLUTION
            // ==================================================
            $customerId = null;
            $customerName = $request->customer_name;
            $customerPhone = $request->customer_phone;

            if ($request->customer_type === 'retailer') {
                $customerId = $request->customer_id;
            } else {
                // WALK-IN LOGIC: Check if exists by Phone, else Create
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
                            'role_id' => 5, // Retailer Role
                            'shop_id' => $user->shop_id,
                            'status' => 'active'
                        ]);

                        // Create Profile
                        \App\Models\RetailerDetail::create([
                            'user_id' => $newUser->id,
                            'shop_id' => $user->shop_id,
                            'customer_type' => 'walkin', // <--- FORCE WALKIN
                            'retailer_shop_name' => $request->customer_name,
                            'credit_limit' => 0
                        ]);

                        $customerId = $newUser->id;
                    }
                }
            }

            // ==================================================
            // 2. STOCK & TOTALS CALCULATION
            // ==================================================
            $totalAmount = 0;
            $invoiceItemsData = [];

            foreach ($request->items as $cartItem) {
                $dbItem = Item::where('id', $cartItem['id'])->lockForUpdate()->first();

                if ($dbItem->stock_quantity < $cartItem['quantity']) {
                    throw new \Exception("Insufficient stock for: " . $dbItem->item_name);
                }

                $dbItem->stock_quantity -= $cartItem['quantity'];
                $dbItem->save();

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

            // ==================================================
            // 3. GENERATE INVOICE
            // ==================================================
            $discount = $request->discount ?? 0;
            $grandTotal = $totalAmount - $discount;
            $invNum = 'INV-' . strtoupper(substr(uniqid(), -8));

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

            // ==================================================
            // 4. LEDGER MANAGEMENT (Full History Logic)
            // ==================================================
            if ($customerId) {
                $retailer = RetailerDetail::where('user_id', $customerId)->first();

                if ($retailer) {
                    // A. Calculate Final Balance Impact
                    // (Previous + New Bill - Payment)
                    $retailer->current_balance = $retailer->current_balance + $grandTotal - $request->paid_amount;
                    $retailer->save();

                    // B. Log the INVOICE (Debit)
                    // We calculate temporary balance before payment to show correct flow
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

                    // C. Log the PAYMENT (Credit) - If any
                    if ($request->paid_amount > 0) {
                        Transaction::create([
                            'shop_id' => $user->shop_id,
                            'user_id' => $customerId,
                            'type' => 'credit',
                            'amount' => $request->paid_amount,
                            'description' => 'Payment for ' . $invNum . ' (' . ucfirst($request->payment_mode) . ')',
                            'reference_id' => $invoice->id,
                            'balance_after' => $retailer->current_balance, // Final accurate balance
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
    public function index()
    {
        $user = Auth::user();
        $invoices = Invoice::where('shop_id', $user->shop_id)
            ->with(['customer', 'items'])
            ->orderBy('id', 'desc')
            ->paginate(20);

        return response()->json(['status' => true, 'data' => $invoices]);
    }
}
