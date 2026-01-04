<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        // 1. Validate Input
        $request->validate([
            'login_id' => 'required', // Can be email or phone
            'password' => 'required',
        ]);

        // 2. Check if input is Email or Phone
        $login_type = filter_var($request->login_id, FILTER_VALIDATE_EMAIL) ? 'email' : 'phone';

        // 3. Find User
        $user = User::where($login_type, $request->login_id)->first();

        // 4. Check Password & User Existence
        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'status' => false,
                'message' => 'Invalid credentials',
            ], 401);
        }

        // 5. Check if Account is Active
        if ($user->status !== 'active') {
            return response()->json([
                'status' => false,
                'message' => 'Your account is deactivated. Contact Admin.',
            ], 403);
        }

        // 6. Create Token
        $token = $user->createToken('auth_token')->plainTextToken;

        // 7. Return Response
        return response()->json([
            'status' => true,
            'message' => 'Login Successful',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => $user->role_id, // 1=Admin, 2=ShopOwner, etc.
                'shop_id' => $user->shop_id,
            ]
        ], 200);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully']);
    }
}
