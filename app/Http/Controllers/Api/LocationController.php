<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Location;
use Illuminate\Support\Facades\Auth;

class LocationController extends Controller
{
    // List Locations
    public function index()
    {
        $user = Auth::user();
        $locations = Location::where('shop_id', $user->shop_id)->get();
        return response()->json(['status' => true, 'data' => $locations]);
    }

    // Create Location
    public function store(Request $request)
    {
        $request->validate([
            'floor_name' => 'required',
            'rack_number' => 'required',
            'shelf_number' => 'required',
        ]);

        $user = Auth::user();

        Location::create([
            'shop_id' => $user->shop_id,
            'floor_name' => $request->floor_name,
            'rack_number' => $request->rack_number,
            'shelf_number' => $request->shelf_number,
        ]);

        return response()->json(['status' => true, 'message' => 'Location Added!']);
    }

    // Delete Location
    public function destroy($id)
    {
        $location = Location::where('id', $id)->where('shop_id', Auth::user()->shop_id)->first();
        if ($location) {
            $location->delete();
            return response()->json(['status' => true, 'message' => 'Deleted']);
        }
        return response()->json(['status' => false, 'message' => 'Not found'], 404);
    }
}
