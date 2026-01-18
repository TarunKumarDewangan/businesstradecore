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

    // 2. Update Shop Details (Including Geo Location)
    public function updateShop(Request $request)
    {
        $request->validate([
            'shop_name' => 'required',
            'latitude' => 'nullable',
            'longitude' => 'nullable',
            'allowed_radius' => 'nullable|integer|min:10',
            'logo' => 'nullable|image|max:2048'
        ]);

        $user = Auth::user();
        $shop = Shop::find($user->shop_id);

        $shop->shop_name = $request->shop_name;
        $shop->gst_number = $request->gst_number;

        // Save Geolocation
        $shop->latitude = $request->latitude;
        $shop->longitude = $request->longitude;
        $shop->allowed_radius = $request->allowed_radius ?? 100; // Default 100 meters

        // Handle Logo Upload
        if ($request->hasFile('logo')) {
            if ($shop->shop_logo) {
                Storage::delete($shop->shop_logo);
            }
            $path = $request->file('logo')->store('logos', 'public');
            $shop->shop_logo = $path;
        }

        $shop->save();

        return response()->json([
            'status' => true,
            'message' => 'Shop Settings Updated',
            'logo_url' => $shop->shop_logo ? asset('storage/'.$shop->shop_logo) : null
        ]);
    }

    // 3. Change Password
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|min:6|confirmed'
        ]);

        $user = Auth::user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['status' => false, 'message' => 'Current password incorrect'], 400);
        }

        $user->update(['password' => Hash::make($request->new_password)]);

        return response()->json(['status' => true, 'message' => 'Password Changed Successfully']);
    }
}
