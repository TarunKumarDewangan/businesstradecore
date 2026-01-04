<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\StaffProfile;
use App\Models\RetailerDetail;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class ShopUserController extends Controller
{
    // 1. List Users (Filter by Role: 'staff' or 'retailer')
    public function index(Request $request)
    {
        $user = Auth::user();
        $roleName = $request->query('type'); // 'staff' or 'retailer'

        // Map text to Role ID (4=Staff, 5=Retailer)
        $roleId = ($roleName === 'staff') ? 4 : 5;

        $users = User::where('shop_id', $user->shop_id)
            ->where('role_id', $roleId)
            ->with($roleName === 'staff' ? 'staffProfile' : 'retailerDetail') // Load extra details
            ->get();

        return response()->json(['status' => true, 'data' => $users]);
    }

    // 2. Create User (Staff or Retailer)
    public function store(Request $request)
    {
        $user = Auth::user();

        $request->validate([
            'name' => 'required',
            'phone' => 'required|unique:users,phone',
            'password' => 'required',
            'type' => 'required|in:staff,retailer' // Must specify type
        ]);

        try {
            DB::beginTransaction();

            // A. Create Basic User Account
            $newUser = User::create([
                'name' => $request->name,
                'phone' => $request->phone,
                'email' => $request->email, // Optional
                'password' => Hash::make($request->password),
                'role_id' => ($request->type === 'staff') ? 4 : 5,
                'shop_id' => $user->shop_id,
                'status' => 'active'
            ]);

            // B. Add Extra Details based on Type
            if ($request->type === 'staff') {
                StaffProfile::create([
                    'user_id' => $newUser->id,
                    'shop_id' => $user->shop_id,
                    'designation' => $request->designation,
                    'salary' => $request->salary,
                    'address' => $request->address
                ]);
            } else {
                // Creating Retailer / Walk-in
                RetailerDetail::create([
                    'user_id' => $newUser->id,
                    'shop_id' => $user->shop_id,
                    'customer_type' => $request->customer_type ?? 'b2b', // <--- Save Type
                    'retailer_shop_name' => $request->retailer_shop_name,
                    'gst_number' => $request->gst_number,
                    'address' => $request->address,
                    'credit_limit' => $request->credit_limit ?? 0
                ]);
            }

            DB::commit();
            return response()->json(['status' => true, 'message' => ucfirst($request->type) . ' Created Successfully!']);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // 3. Delete User
    public function destroy($id)
    {
        // Only allow deleting users belonging to this shop
        $targetUser = User::where('id', $id)->where('shop_id', Auth::user()->shop_id)->first();

        if ($targetUser) {
            $targetUser->delete(); // This cascades to profiles because of DB setup
            return response()->json(['status' => true, 'message' => 'User Deleted']);
        }
        return response()->json(['status' => false, 'message' => 'User not found'], 404);
    }

    // 4. Update User (Staff/Retailer)
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $targetUser = User::where('id', $id)->where('shop_id', $user->shop_id)->firstOrFail();

        // Update Basic Info
        $targetUser->name = $request->name;
        $targetUser->phone = $request->phone;

        // Update Password only if provided
        if (!empty($request->password)) {
            $targetUser->password = Hash::make($request->password);
        }
        $targetUser->save();

        // Update Profile based on Type
        if ($targetUser->role_id == 4) { // Staff
            StaffProfile::updateOrCreate(
                ['user_id' => $targetUser->id],
                [
                    'designation' => $request->designation,
                    'salary' => $request->salary,
                    'address' => $request->address
                ]
            );
        } else { // Retailer
            RetailerDetail::updateOrCreate(
                ['user_id' => $targetUser->id],
                [
                    'retailer_shop_name' => $request->retailer_shop_name,
                    'gst_number' => $request->gst_number,
                    'credit_limit' => $request->credit_limit,
                    'address' => $request->address
                ]
            );
        }

        return response()->json(['status' => true, 'message' => 'User Updated Successfully']);
    }
}
