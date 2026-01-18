<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Repair;
use App\Models\RepairItem;
use App\Models\Item;
use App\Services\StockService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RepairController extends Controller
{
    // 1. Create Repair (Staff = Pending, Master = Completed)
    public function store(Request $request)
    {
        $request->validate([
            'vehicle_number' => 'required',
            'items' => 'required|array',
            'service_charge' => 'nullable|numeric'
        ]);

        $user = Auth::user();

        // Logic: If Master(2/3) -> Completed. If Staff(4) -> Pending.
        $isMaster = in_array($user->role_id, [2, 3]);
        $status = $isMaster ? 'completed' : 'pending';

        // Staff ID: If Master selects someone, use that. If Staff logs in, use their own ID.
        $staffId = $isMaster ? $request->staff_id : $user->id;

        try {
            DB::beginTransaction();

            $jobNum = 'JOB-' . strtoupper(substr(uniqid(), -6));
            $partsCost = 0;
            $repairItemsData = [];

            foreach ($request->items as $cartItem) {
                $dbItem = Item::where('id', $cartItem['id'])->lockForUpdate()->first();

                // If Completed (Master), Check & Deduct Stock immediately
                if ($status === 'completed') {
                    if ($dbItem->stock_quantity < $cartItem['quantity']) {
                        throw new \Exception("Insufficient stock for: " . $dbItem->item_name);
                    }
                    StockService::update($dbItem->id, -($cartItem['quantity']), "Repair Job " . $jobNum);
                }

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

            $serviceCharge = $request->service_charge ?? 0;
            $grandTotal = $partsCost + $serviceCharge;

            $repair = Repair::create([
                'shop_id' => $user->shop_id,
                'job_number' => $jobNum,
                'vehicle_number' => strtoupper($request->vehicle_number),
                'customer_name' => $request->customer_name,
                'customer_phone' => $request->customer_phone,
                'staff_id' => $staffId,
                'total_parts_cost' => $partsCost,
                'service_charge' => $serviceCharge,
                'grand_total' => $grandTotal,
                'status' => $status
            ]);

            foreach ($repairItemsData as $data) {
                $data['repair_id'] = $repair->id;
                RepairItem::create($data);
            }

            DB::commit();
            return response()->json(['status' => true, 'message' => $status === 'pending' ? 'Request Sent to Owner!' : 'Job Saved Successfully!']);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 400);
        }
    }

    // 2. List Repairs (Filter by Status)
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = Repair::where('shop_id', $user->shop_id)
                       ->with(['staff:id,name', 'items']);

        // Status Filter (Default: completed)
        $status = $request->query('status', 'completed');
        $query->where('status', $status);

        if ($request->has('search') && !empty($request->search)) {
            $query->where('vehicle_number', 'LIKE', "%{$request->search}%");
        }

        $repairs = $query->orderBy('id', 'desc')->paginate(20);
        return response()->json(['status' => true, 'data' => $repairs]);
    }

    // 3. Approve Repair (Pending -> Completed + Deduct Stock)
    public function approve($id)
    {
        $user = Auth::user();
        try {
            DB::beginTransaction();
            $repair = Repair::where('id', $id)->where('shop_id', $user->shop_id)->with('items')->firstOrFail();

            if($repair->status === 'completed') return response()->json(['status'=>false, 'message'=>'Already Approved'], 400);

            // Deduct Stock Now
            foreach($repair->items as $item) {
                $dbItem = Item::find($item->item_id);
                if($dbItem->stock_quantity < $item->quantity) throw new \Exception("Insufficient Stock for " . $item->item_name);
                StockService::update($dbItem->id, -($item->quantity), "Repair Job Approved " . $repair->job_number);
            }

            $repair->status = 'completed';
            $repair->save();

            DB::commit();
            return response()->json(['status' => true, 'message' => 'Job Approved & Stock Deducted']);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 400);
        }
    }

    // 4. Delete Repair (For Pending Requests)
    public function destroy($id)
    {
        $user = Auth::user();
        $repair = Repair::where('id', $id)->where('shop_id', $user->shop_id)->firstOrFail();

        // If completed, we need to restore stock (Advanced). For now, allow delete only pending.
        if($repair->status === 'completed') {
             // Optional: Add restore logic if you want to allow deleting history
             return response()->json(['status'=>false, 'message'=>'Cannot delete completed history directly.'], 400);
        }

        $repair->delete();
        return response()->json(['status' => true, 'message' => 'Request Deleted']);
    }
}
