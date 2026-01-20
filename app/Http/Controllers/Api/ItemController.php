<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Item;
use Illuminate\Support\Facades\Auth;

class ItemController extends Controller
{
    /**
     * 1. List Items (With Purchase Price)
     */
    /**
     * 1. List Items (Updated with Category Search)
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = Item::where('shop_id', $user->shop_id);

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                // 1. Search Item Fields
                $q->where('item_name', 'LIKE', "%{$search}%")
                    ->orWhere('part_number', 'LIKE', "%{$search}%")
                    ->orWhere('compatible_models', 'LIKE', "%{$search}%")

                    // 2. Search Linked Category Name
                    ->orWhereHas('category', function ($subQuery) use ($search) {
                        $subQuery->where('name', 'LIKE', "%{$search}%");
                    });
            });
        }

        $items = $query->select([
            'id',
            'item_name',
            'part_number',
            'category_id',
            'subcategory_id',
            'location_id',
            'purchase_price',
            'selling_price',
            'stock_quantity',
            'created_at',
            'compatible_models'
        ])
            ->with([
                'category:id,name',
                'location:id,floor_name,rack_number,shelf_number'
            ])
            ->orderByDesc('id')
            ->paginate(10);

        return response()->json([
            'status' => true,
            'data' => $items
        ]);
    }

    /**
     * 2. Store Item (Category Optional)
     */
    public function store(Request $request)
    {
        $request->validate([
            'item_name' => 'required|string',
            'category_id' => 'nullable|exists:categories,id', // Optional
            'subcategory_id' => 'nullable|exists:categories,id',
            'selling_price' => 'nullable|numeric',
            'stock_quantity' => 'nullable|integer',
        ]);

        $user = Auth::user();

        Item::create([
            'shop_id' => $user->shop_id,
            'category_id' => $request->category_id,
            'subcategory_id' => $request->subcategory_id,
            'location_id' => $request->location_id,
            'item_name' => strtoupper($request->item_name),
            'part_number' => strtoupper($request->part_number),
            'compatible_models' => strtoupper($request->compatible_models),
            'purchase_price' => $request->purchase_price ?? 0,
            'selling_price' => $request->selling_price ?? 0,
            'stock_quantity' => $request->stock_quantity ?? 0,
        ]);

        return response()->json(['status' => true, 'message' => 'Item Added Successfully']);
    }

    /**
     * 3. Update Item (Category Optional)
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $item = Item::where('id', $id)->where('shop_id', $user->shop_id)->firstOrFail();

        $data = [
            'item_name' => strtoupper($request->item_name),
            'part_number' => strtoupper($request->part_number),
            'category_id' => $request->category_id, // Can be null
            'subcategory_id' => $request->subcategory_id,
            'location_id' => $request->location_id,
            'compatible_models' => strtoupper($request->compatible_models),
            'selling_price' => $request->selling_price ?? 0,
            'stock_quantity' => $request->stock_quantity ?? 0,
        ];

        // Only update Purchase Price if sent (avoid overwriting with 0)
        if ($request->has('purchase_price') && $request->purchase_price !== null) {
            $data['purchase_price'] = $request->purchase_price;
        }

        $item->update($data);

        return response()->json(['status' => true, 'message' => 'Item Updated']);
    }

    /**
     * 4. Delete Item (Safe)
     */
    public function destroy($id)
    {
        $user = Auth::user();
        $item = Item::where('id', $id)->where('shop_id', $user->shop_id)->firstOrFail();

        try {
            $item->delete();
            return response()->json(['status' => true, 'message' => 'Item Deleted']);
        } catch (\Illuminate\Database\QueryException $e) {
            if ($e->getCode() == "23000") {
                return response()->json(['status' => false, 'message' => 'Cannot delete: This item is linked to existing Invoices or Orders.'], 400);
            }
            return response()->json(['status' => false, 'message' => 'Server Error'], 500);
        }
    }
}
