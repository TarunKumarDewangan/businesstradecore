<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Attendance;
use App\Models\WorkLog;
use Illuminate\Support\Facades\Auth;

class StaffOpController extends Controller
{
    // ================= ATTENDANCE =================

    // 1. Get Latest Status for Today
    public function todayStatus()
    {
        $user = Auth::user();
        // USE NOW() to get India Time
        $today = now()->format('Y-m-d');

        $attendance = Attendance::where('user_id', $user->id)
            ->where('date', $today)
            ->orderBy('id', 'desc')
            ->first();

        return response()->json(['status' => true, 'data' => $attendance]);
    }

    // 2. Punch In / Out (Supports Multiple Shifts)
    public function punch(Request $request)
    {
        $user = Auth::user();

        // USE NOW() to get India Time
        $today = now()->format('Y-m-d');
        $now = now()->format('H:i:s');

        $latestAttendance = Attendance::where('user_id', $user->id)
            ->where('date', $today)
            ->orderBy('id', 'desc')
            ->first();

        // SCENARIO A: New Check In
        if (!$latestAttendance || $latestAttendance->check_out) {
            Attendance::create([
                'shop_id' => $user->shop_id,
                'user_id' => $user->id,
                'date' => $today,
                'check_in' => $now,
                'status' => 'present'
            ]);
            return response()->json(['status' => true, 'message' => 'Checked In! ☀️']);
        }

        // SCENARIO B: Check Out
        else {
            $latestAttendance->update(['check_out' => $now]);
            return response()->json(['status' => true, 'message' => 'Checked Out! 🌙']);
        }
    }

    // 3. Get All Attendance
    public function indexAttendance()
    {
        $user = Auth::user();

        $data = Attendance::where('shop_id', $user->shop_id)
            ->with('user:id,name')
            ->orderBy('date', 'desc')
            ->orderBy('check_in', 'desc')
            ->limit(50)
            ->get();

        $formattedData = $data->map(function ($item) {
            return [
                'id' => $item->id,
                'date' => $item->date,
                'staff_name' => $item->user ? $item->user->name : 'Unknown',
                'check_in' => $item->check_in,
                'check_out' => $item->check_out,
                'status' => $item->status
            ];
        });

        return response()->json(['status' => true, 'data' => $formattedData]);
    }

    // ================= WORK LOGS =================

    // 4. Submit Work Log
    public function storeWorkLog(Request $request)
    {
        $request->validate([
            'title' => 'required',
            'description' => 'nullable'
        ]);

        $user = Auth::user();

        WorkLog::create([
            'shop_id' => $user->shop_id,
            'user_id' => $user->id,
            'date' => now()->format('Y-m-d'), // Use India Time
            'title' => $request->title,
            'description' => $request->description
        ]);

        return response()->json(['status' => true, 'message' => 'Work Report Submitted']);
    }

    // 5. Get Work Logs
    public function indexWorkLogs()
    {
        $user = Auth::user();
        $logs = WorkLog::where('shop_id', $user->shop_id)
            ->with('user:id,name')
            ->orderBy('date', 'desc')
            ->limit(20)
            ->get();

        return response()->json(['status' => true, 'data' => $logs]);
    }

    public function getStaffStatus($id)
    {
        $master = Auth::user();

        // Security: Ensure staff belongs to Master's shop
        $staff = \App\Models\User::where('id', $id)->where('shop_id', $master->shop_id)->first();
        if (!$staff)
            return response()->json(['status' => false, 'message' => 'Staff not found']);

        $today = now()->format('Y-m-d');

        $attendance = Attendance::where('user_id', $id)
            ->where('date', $today)
            ->orderBy('id', 'desc')
            ->first();

        return response()->json(['status' => true, 'data' => $attendance]);
    }

    // 7. Manual Punch by Master
    public function manualPunch(Request $request)
    {
        $request->validate(['user_id' => 'required|exists:users,id']);
        $master = Auth::user();
        $targetUserId = $request->user_id;

        // Security Check
        $staff = \App\Models\User::where('id', $targetUserId)->where('shop_id', $master->shop_id)->first();
        if (!$staff)
            return response()->json(['status' => false, 'message' => 'Unauthorized']);

        $today = now()->format('Y-m-d');
        $now = now()->format('H:i:s');

        $latest = Attendance::where('user_id', $targetUserId)->where('date', $today)->orderBy('id', 'desc')->first();

        // Logic: Same as self-punch, but for target user
        if (!$latest || $latest->check_out) {
            Attendance::create([
                'shop_id' => $master->shop_id,
                'user_id' => $targetUserId,
                'date' => $today,
                'check_in' => $now,
                'status' => 'present'
            ]);
            return response()->json(['status' => true, 'message' => 'Staff Checked In Successfully']);
        } else {
            $latest->update(['check_out' => $now]);
            return response()->json(['status' => true, 'message' => 'Staff Checked Out Successfully']);
        }
    }

    // 8. Manual Work Log by Master
    public function manualWorkLog(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'title' => 'required',
            'description' => 'nullable'
        ]);

        $master = Auth::user();

        WorkLog::create([
            'shop_id' => $master->shop_id,
            'user_id' => $request->user_id,
            'date' => now()->format('Y-m-d'),
            'title' => $request->title,
            'description' => $request->description . ' (Added by Admin)'
        ]);

        return response()->json(['status' => true, 'message' => 'Work Log Added for Staff']);
    }
}
