<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Controllers
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ShopController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ItemController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\ShopUserController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\StaffOpController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DeliveryPartnerController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ReturnController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\StockHistoryController;
use App\Http\Controllers\Api\RepairController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// ========================
// 🔓 PUBLIC ROUTES
// ========================
Route::post('/login', [AuthController::class, 'login']);


// ========================
// 🔐 PROTECTED ROUTES
// ========================
Route::middleware('auth:sanctum')->group(function () {

    // Auth & User
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return $request->user(); });

    // 1️⃣ SHOP & SETTINGS
    Route::get('/shops', [ShopController::class, 'index']);
    Route::post('/shops', [ShopController::class, 'store']);
    Route::put('/shops/{id}', [ShopController::class, 'update']);
    Route::delete('/shops/{id}', [ShopController::class, 'destroy']);
    Route::post('/shops/{id}/toggle', [ShopController::class, 'toggleStatus']);

    Route::get('/settings/shop', [SettingsController::class, 'getShopDetails']);
    Route::post('/settings/shop', [SettingsController::class, 'updateShop']);
    Route::post('/settings/password', [SettingsController::class, 'changePassword']);

    // 2️⃣ INVENTORY (Categories, Locations, Items, Stock)
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::put('/categories/{id}', [CategoryController::class, 'update']);
    Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);
    Route::post('/categories/move-delete', [CategoryController::class, 'moveAndDelete']);

    Route::get('/locations', [LocationController::class, 'index']);
    Route::post('/locations', [LocationController::class, 'store']);
    Route::delete('/locations/{id}', [LocationController::class, 'destroy']);

    Route::get('/items', [ItemController::class, 'index']);
    Route::post('/items', [ItemController::class, 'store']);
    Route::put('/items/{id}', [ItemController::class, 'update']);
    Route::delete('/items/{id}', [ItemController::class, 'destroy']);

    Route::get('/stock-history', [StockHistoryController::class, 'index']);

    // 3️⃣ USER MANAGEMENT (Staff, Retailers, Partners)
    Route::get('/shop-users', [ShopUserController::class, 'index']);
    Route::post('/shop-users', [ShopUserController::class, 'store']);
    Route::put('/shop-users/{id}', [ShopUserController::class, 'update']);
    Route::delete('/shop-users/{id}', [ShopUserController::class, 'destroy']);

    Route::get('/partners', [DeliveryPartnerController::class, 'index']);
    Route::post('/partners', [DeliveryPartnerController::class, 'store']);
    Route::delete('/partners/{id}', [DeliveryPartnerController::class, 'destroy']);

    // 4️⃣ STAFF OPERATIONS (Attendance & Logs)
    Route::get('/staff/status', [StaffOpController::class, 'todayStatus']);
    Route::post('/staff/punch', [StaffOpController::class, 'punch']);
    Route::post('/staff/worklog', [StaffOpController::class, 'storeWorkLog']);

    // Master View & Manual Entry
    Route::get('/staff/attendance-list', [StaffOpController::class, 'indexAttendance']);
    Route::get('/staff/worklog-list', [StaffOpController::class, 'indexWorkLogs']);
    Route::get('/staff-status/{id}', [StaffOpController::class, 'getStaffStatus']);
    Route::post('/manual/punch', [StaffOpController::class, 'manualPunch']);
    Route::post('/manual/worklog', [StaffOpController::class, 'manualWorkLog']);

    // 5️⃣ SALES & BILLING (Invoices & Ledger)
    Route::get('/invoices', [InvoiceController::class, 'index']);
    Route::post('/invoices', [InvoiceController::class, 'store']);
    Route::put('/invoices/{id}', [InvoiceController::class, 'update']); // Edit Invoice
    Route::delete('/invoices/{id}', [InvoiceController::class, 'destroy']); // Delete Invoice

    Route::get('/ledger', [TransactionController::class, 'index']);
    Route::post('/ledger/payment', [TransactionController::class, 'store']);

    // 6️⃣ B2B ORDERS & RETURNS
    // Retailer Side
    Route::get('/catalog', [OrderController::class, 'getCatalog']);
    Route::post('/order/place', [OrderController::class, 'placeOrder']);
    Route::get('/order/my-history', [OrderController::class, 'myOrders']);
    Route::post('/order/{id}/cancel', [OrderController::class, 'cancelOrder']);
    Route::post('/order/{id}/update', [OrderController::class, 'updateOrder']);
    Route::post('/order/{id}/received', [OrderController::class, 'markReceived']);
    Route::post('/return/request', [ReturnController::class, 'store']);

    // Master Side
    Route::get('/order/incoming', [OrderController::class, 'incomingOrders']);
    Route::post('/order/manual', [OrderController::class, 'createOrderManual']);
    Route::post('/order/{id}/dispatch', [OrderController::class, 'dispatchOrder']);

    // Master Actions (Reject, Restore, Deliver, Reset)
    Route::post('/order/{id}/reject', [OrderController::class, 'rejectOrder']);
    Route::post('/order/{id}/restore', [OrderController::class, 'restoreOrder']);
    Route::post('/order/{id}/deliver', [OrderController::class, 'markDelivered']);
    Route::post('/order/{id}/revert-delivery', [OrderController::class, 'revertDelivery']);
    Route::post('/order/{id}/cancel-dispatch', [OrderController::class, 'cancelDispatch']);

    // Returns Management (Master)
    Route::get('/returns', [ReturnController::class, 'index']);
    Route::post('/return/{id}/process', [ReturnController::class, 'approve']); // Credit Approval
    Route::post('/return/{id}/inspect', [ReturnController::class, 'inspect']); // Stock Inspection

    // 7️⃣ REPAIRS & SERVICE (Maker-Checker)
    Route::get('/repairs', [RepairController::class, 'index']);
    Route::post('/repairs', [RepairController::class, 'store']);
    Route::post('/repairs/{id}/approve', [RepairController::class, 'approve']);
    Route::delete('/repairs/{id}', [RepairController::class, 'destroy']);

    // 8️⃣ DASHBOARD & STATS
    Route::get('/dashboard/stats', [DashboardController::class, 'getStats']);
    Route::get('/dashboard/counts', [DashboardController::class, 'getCounts']);
});
