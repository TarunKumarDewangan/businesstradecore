<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Repair;
use App\Models\RepairItem;
use App\Models\Item;
use App\Services\StockService; // Import Service
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RepairController extends Controller
{
    // 1. Create New Repair Job (Deducts Stock & Logs History)
    public function store(Request $request)
    {
        $request->validate([
            'vehicle_number' => 'required',
            'staff_id' => 'required|exists:users,id',
            'items' => 'required|array',
            'service_charge' => 'nullable|numeric'
        ]);

        $user = Auth::user();

        try {
            DB::beginTransaction();

            $jobNum = 'JOB-' . strtoupper(substr(uniqid(), -6));

            // A. Calculate Costs & Check Stock
            $partsCost = 0;
            $repairItemsData = [];

            foreach ($request->items as $cartItem) {
                $dbItem = Item::where('id', $cartItem['id'])->lockForUpdate()->first();

                if ($dbItem->stock_quantity < $cartItem['quantity']) {
                    throw new \Exception("Insufficient stock for: " . $dbItem->item_name);
                }

                // USE SERVICE TO DEDUCT STOCK
                StockService::update($dbItem->id, -($cartItem['quantity']), "Repair Job " . $jobNum);

                $lineTotal = $dbItem->selling_price * $cartItem['quantity'];
                $partsCost += $lineTotal;

                $repairItemsData[] = [
                    'item_id' => $dbItem->id,
                    'item_name' => $dbItem->item_name,
                    'quantity' => $cartItem['quantity'],
                    'unit_price' => $dbItem->selling_price,
                    'total_price' => $lineTotal
                ];
            }

            // B. Create Repair Header
            $serviceCharge = $request->service_charge ?? 0;
            $grandTotal = $partsCost + $serviceCharge;

            $repair = Repair::create([
                'shop_id' => $user->shop_id,
                'job_number' => $jobNum,
                'vehicle_number' => strtoupper($request->vehicle_number),
                'customer_name' => $request->customer_name,
                'customer_phone' => $request->customer_phone,
                'staff_id' => $request->staff_id,
                'total_parts_cost' => $partsCost,
                'service_charge' => $serviceCharge,
                'grand_total' => $grandTotal
            ]);

            // C. Save Items
            foreach ($repairItemsData as $data) {
                $data['repair_id'] = $repair->id;
                RepairItem::create($data);
            }

            DB::commit();
            return response()->json(['status' => true, 'message' => 'Job Created Successfully!', 'job_number' => $jobNum]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 400);
        }
    }

    // 2. List Repairs (History/Report)
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = Repair::where('shop_id', $user->shop_id)
            ->with(['staff:id,name', 'items']);

        // Filter by Vehicle No or Job No
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('vehicle_number', 'LIKE', "%{$search}%")
                    ->orWhere('job_number', 'LIKE', "%{$search}%");
            });
        }

        $repairs = $query->orderBy('id', 'desc')->paginate(20);
        return response()->json(['status' => true, 'data' => $repairs]);
    }
}
