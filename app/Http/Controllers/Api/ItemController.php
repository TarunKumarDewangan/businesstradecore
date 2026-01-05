<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Item;
use Illuminate\Support\Facades\Auth;

class ItemController extends Controller
{
    /**
     * 1️⃣ List Items (Optimized + Paginated)
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = Item::where('shop_id', $user->shop_id);

        // SEARCH FILTER
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('item_name', 'LIKE', "%{$search}%")
                    ->orWhere('part_number', 'LIKE', "%{$search}%")
                    ->orWhere('compatible_models', 'LIKE', "%{$search}%");
            });
        }

        $items = $query->select([
            'id',
            'item_name',
            'part_number',
            'category_id',
            'location_id',
            'selling_price',
            'stock_quantity',
            'created_at'
        ])
            ->with([
                'category:id,name',
                'location:id,floor_name,rack_number,shelf_number'
            ])
            ->orderByDesc('id')
            ->paginate(10); // 10 records per page

        return response()->json([
            'status' => true,
            'data' => $items
        ]);
    }

    /**
     * 2️⃣ Store Item
     */
    public function store(Request $request)
    {
        $request->validate([
            'category_id' => 'required|exists:categories,id',
            'subcategory_id' => 'nullable|exists:categories,id', // Optional
            'item_name' => 'required|string',
            'selling_price' => 'required|numeric',
            'stock_quantity' => 'required|integer',
        ]);

        $user = Auth::user();

        Item::create([
            'shop_id' => $user->shop_id,
            'category_id' => $request->category_id,
            'subcategory_id' => $request->subcategory_id, // <--- Added
            'location_id' => $request->location_id,
            'item_name' => strtoupper($request->item_name),
            'part_number' => strtoupper($request->part_number),
            'compatible_models' => strtoupper($request->compatible_models),
            'purchase_price' => $request->purchase_price ?? 0,
            'selling_price' => $request->selling_price,
            'stock_quantity' => $request->stock_quantity,
        ]);

        return response()->json([
            'status' => true,
            'message' => 'Item Added Successfully'
        ]);
    }

    /**
     * 3️⃣ Update Item
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();

        $item = Item::where('id', $id)
            ->where('shop_id', $user->shop_id)
            ->firstOrFail();

        // Allow updating all relevant fields
        $item->update([
            'item_name' => strtoupper($request->item_name),
            'part_number' => strtoupper($request->part_number),
            'category_id' => $request->category_id,
            'subcategory_id' => $request->subcategory_id, // <--- Added
            'location_id' => $request->location_id,
            'compatible_models' => strtoupper($request->compatible_models),
            'selling_price' => $request->selling_price,
            'stock_quantity' => $request->stock_quantity,
            // We usually don't update purchase price here to keep history, but you can if needed
        ]);

        return response()->json([
            'status' => true,
            'message' => 'Item Updated'
        ]);
    }
    /**
     * 4️⃣ Delete Item
     */
    /**
     * 4️⃣ Delete Item (Safe)
     */
    public function destroy($id)
    {
        $user = Auth::user();

        $item = Item::where('id', $id)
            ->where('shop_id', $user->shop_id)
            ->firstOrFail();

        try {
            $item->delete();
            return response()->json([
                'status' => true,
                'message' => 'Item Deleted'
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            // Error Code 23000 means Integrity Constraint Violation (Foreign Key)
            if ($e->getCode() == "23000") {
                return response()->json([
                    'status' => false,
                    'message' => 'Cannot delete: This item is linked to existing Invoices or Orders.'
                ], 400);
            }

            return response()->json([
                'status' => false,
                'message' => 'Server Error: ' . $e->getMessage()
            ], 500);
        }
    }
}
