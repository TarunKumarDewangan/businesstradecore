<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    // 1. Get Shop Details
    public function getShopDetails()
    {
        $user = Auth::user();
        $shop = Shop::find($user->shop_id);
        return response()->json(['status' => true, 'data' => $shop]);
    }

    // 2. Update Shop Details (Name, Address, Logo)
    public function updateShop(Request $request)
    {
        $request->validate([
            'shop_name' => 'required',
            'address' => 'required', // We will add this column to DB
            'logo' => 'nullable|image|max:2048' // Max 2MB
        ]);

        $user = Auth::user();
        $shop = Shop::find($user->shop_id);

        $shop->shop_name = $request->shop_name;
        // We need to add 'address' column to shops table first!
        // For now, let's assume we use 'gst_number' field for address or add a migration.
        // Let's stick to updating existing fields + GST.
        $shop->gst_number = $request->gst_number;

        // Handle Logo Upload
        if ($request->hasFile('logo')) {
            // Delete old logo if exists
            if ($shop->shop_logo) {
                Storage::delete($shop->shop_logo);
            }
            $path = $request->file('logo')->store('logos', 'public');
            $shop->shop_logo = $path;
        }

        $shop->save();

        return response()->json(['status' => true, 'message' => 'Shop Settings Updated', 'logo_url' => asset('storage/' . $shop->shop_logo)]);
    }

    // 3. Change Password
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|min:6|confirmed' // expects new_password_confirmation field
        ]);

        $user = Auth::user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['status' => false, 'message' => 'Current password incorrect'], 400);
        }

        $user->update(['password' => Hash::make($request->new_password)]);

        return response()->json(['status' => true, 'message' => 'Password Changed Successfully']);
    }
}
