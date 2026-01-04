<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Transaction;
use App\Models\RetailerDetail;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    // 1. Get Ledger for a specific Retailer
    public function index(Request $request)
    {
        $request->validate(['retailer_id' => 'required']);
        $user = Auth::user();

        $transactions = Transaction::where('shop_id', $user->shop_id)
            ->where('user_id', $request->retailer_id)
            ->orderBy('date', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json(['status' => true, 'data' => $transactions]);
    }

    // 2. Add Payment (Credit Entry)
    public function store(Request $request)
    {
        $request->validate([
            'retailer_id' => 'required|exists:users,id',
            'amount' => 'required|numeric|min:1',
            'description' => 'nullable|string',
            'date' => 'required|date'
        ]);

        $user = Auth::user();

        try {
            DB::beginTransaction();

            // A. Update Retailer Balance (Reduce Debt)
            $retailer = RetailerDetail::where('user_id', $request->retailer_id)->firstOrFail();
            $retailer->current_balance -= $request->amount;
            $retailer->save();

            // B. Log Transaction
            Transaction::create([
                'shop_id' => $user->shop_id,
                'user_id' => $request->retailer_id,
                'type' => 'credit', // Credit means money came IN, debt goes DOWN
                'amount' => $request->amount,
                'description' => $request->description ?? 'Cash Payment',
                'balance_after' => $retailer->current_balance,
                'date' => $request->date
            ]);

            DB::commit();
            return response()->json(['status' => true, 'message' => 'Payment Added Successfully!']);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
