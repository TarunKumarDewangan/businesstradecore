<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class ShopController extends Controller
{
    // 1. List all Shops
    public function index()
    {
        $shops = Shop::orderBy('id', 'desc')->get();
        return response()->json(['status' => true, 'data' => $shops]);
    }

    // 2. Create New Shop (And its Owner)
    public function store(Request $request)
    {
        $request->validate([
            'shop_name' => 'required',
            'owner_name' => 'required',
            'owner_mobile' => 'required|unique:users,phone',
            'password' => 'required|min:6',
        ]);

        try {
            DB::beginTransaction();

            // A. Create Shop
            $shop = new Shop();
            $shop->shop_name = $request->shop_name;
            $shop->gst_number = $request->gst_number; // Optional
            $shop->save();

            // B. Create Owner User (Role ID 2 = ShopOwner)
            // Wait! In your Blueprint, Master is the main operational ID.
            // Let's assume ShopOwner is Role 2 and Master is Role 3.
            // For now, we create the Owner.

            $user = User::create([
                'name' => $request->owner_name,
                'phone' => $request->owner_mobile,
                'email' => $request->owner_email, // Optional
                'password' => Hash::make($request->password),
                'role_id' => 2, // Shop Owner
                'shop_id' => $shop->id,
                'status' => 'active'
            ]);

            DB::commit();

            return response()->json(['status' => true, 'message' => 'Shop & Owner Created Successfully!']);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // 3. Toggle Status (Active/Inactive)
    public function toggleStatus($id)
    {
        $shop = Shop::find($id);
        if (!$shop) {
            return response()->json(['status' => false, 'message' => 'Shop not found'], 404);
        }

        $shop->is_active = !$shop->is_active; // Switch true/false
        $shop->save();

        return response()->json(['status' => true, 'message' => 'Shop status updated', 'is_active' => $shop->is_active]);
    }
}
