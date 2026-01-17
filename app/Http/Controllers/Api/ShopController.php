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
    // 1. List all Shops (With Owner Details)
    public function index()
    {
        $shops = Shop::with('owner')->orderBy('id', 'desc')->get();
        return response()->json(['status' => true, 'data' => $shops]);
    }

    // 2. Create New Shop & Owner
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

            $shop = Shop::create([
                'shop_name' => $request->shop_name,
                'gst_number' => $request->gst_number,
                'is_active' => true
            ]);

            User::create([
                'name' => $request->owner_name,
                'phone' => $request->owner_mobile,
                'password' => Hash::make($request->password),
                'role_id' => 3, // Master
                'shop_id' => $shop->id,
                'status' => 'active'
            ]);

            DB::commit();
            return response()->json(['status' => true, 'message' => 'Shop Created Successfully!']);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // 3. Update Shop & Owner
    public function update(Request $request, $id)
    {
        $shop = Shop::with('owner')->find($id);
        if (!$shop)
            return response()->json(['status' => false, 'message' => 'Shop not found'], 404);

        try {
            DB::beginTransaction();

            // Update Shop Info
            $shop->shop_name = $request->shop_name;
            $shop->gst_number = $request->gst_number;
            $shop->save();

            // Update Owner Info
            if ($shop->owner) {
                $shop->owner->name = $request->owner_name;
                $shop->owner->phone = $request->owner_mobile;
                if (!empty($request->password)) {
                    $shop->owner->password = Hash::make($request->password);
                }
                $shop->owner->save();
            }

            DB::commit();
            return response()->json(['status' => true, 'message' => 'Shop Updated Successfully!']);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // 4. Toggle Active Status
    public function toggleStatus($id)
    {
        $shop = Shop::find($id);
        if (!$shop)
            return response()->json(['status' => false, 'message' => 'Not found'], 404);

        $shop->is_active = !$shop->is_active;
        $shop->save();

        // Also deactivate/activate the owner user
        $userStatus = $shop->is_active ? 'active' : 'inactive';
        User::where('shop_id', $id)->update(['status' => $userStatus]);

        return response()->json(['status' => true, 'message' => 'Status Updated', 'is_active' => $shop->is_active]);
    }

    // 5. Delete Shop
    public function destroy($id)
    {
        $shop = Shop::find($id);
        if (!$shop)
            return response()->json(['status' => false, 'message' => 'Not found'], 404);

        // Delete Shop (Cascading deletes users/items usually, but let's be safe)
        $shop->delete();

        return response()->json(['status' => true, 'message' => 'Shop Deleted Successfully']);
    }
}
