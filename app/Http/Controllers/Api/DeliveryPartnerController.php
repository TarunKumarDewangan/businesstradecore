<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\DeliveryPartner; // <--- This line is CRITICAL
use Illuminate\Support\Facades\Auth;

class DeliveryPartnerController extends Controller
{
    // List all partners
    public function index()
    {
        $user = Auth::user();
        $partners = DeliveryPartner::where('shop_id', $user->shop_id)->get();
        return response()->json(['status' => true, 'data' => $partners]);
    }

    // Add new partner
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required',
            'phone' => 'required'
        ]);

        $user = Auth::user();

        DeliveryPartner::create([
            'shop_id' => $user->shop_id,
            'name' => $request->name,
            'phone' => $request->phone,
            'vehicle_number' => $request->vehicle_number
        ]);

        return response()->json(['status' => true, 'message' => 'Partner Added Successfully']);
    }

    // Delete
    public function destroy($id)
    {
        $user = Auth::user();
        $partner = DeliveryPartner::where('id', $id)->where('shop_id', $user->shop_id)->first();

        if ($partner) {
            $partner->delete();
            return response()->json(['status' => true, 'message' => 'Deleted']);
        }
        return response()->json(['status' => false, 'message' => 'Not found'], 404);
    }
}
