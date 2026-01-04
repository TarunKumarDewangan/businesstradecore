<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ShopController;
use App\Http\Controllers\Api\CategoryController; // <--- Added semicolon here
use App\Http\Controllers\Api\ItemController;
use App\Http\Controllers\Api\LocationController;
use app\Http\Controllers\Api\ShopUserController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\StaffOpController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DeliveryPartnerController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ReturnController;
use App\Http\Controllers\Api\SettingsController;


/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public Routes (No Login Required)
Route::post('/login', [AuthController::class, 'login']);

// Protected Routes (Login Required)
Route::middleware('auth:sanctum')->group(function () {

    // Logout
    Route::post('/logout', [AuthController::class, 'logout']);

    // Get User Details
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Shop Management Routes
    Route::get('/shops', [ShopController::class, 'index']);
    Route::post('/shops', [ShopController::class, 'store']);
    Route::post('/shops/{id}/toggle', [ShopController::class, 'toggleStatus']);

    // Category Routes
    Route::get('/categories', [App\Http\Controllers\Api\CategoryController::class, 'index']);
    Route::post('/categories', [App\Http\Controllers\Api\CategoryController::class, 'store']);
    Route::put('/categories/{id}', [App\Http\Controllers\Api\CategoryController::class, 'update']); // <--- NEW
    Route::delete('/categories/{id}', [App\Http\Controllers\Api\CategoryController::class, 'destroy']);
    Route::post('/categories/move-delete', [App\Http\Controllers\Api\CategoryController::class, 'moveAndDelete']);

    // Location Routes
    Route::get('/locations', [App\Http\Controllers\Api\LocationController::class, 'index']);
    Route::post('/locations', [App\Http\Controllers\Api\LocationController::class, 'store']);
    Route::delete('/locations/{id}', [App\Http\Controllers\Api\LocationController::class, 'destroy']);

    // Item Routes
    Route::get('/items', [App\Http\Controllers\Api\ItemController::class, 'index']);
    Route::post('/items', [App\Http\Controllers\Api\ItemController::class, 'store']);
    Route::put('/items/{id}', [App\Http\Controllers\Api\ItemController::class, 'update']); // PUT for updates
    Route::delete('/items/{id}', [App\Http\Controllers\Api\ItemController::class, 'destroy']);

    // Staff & Retailer Management
    Route::get('/shop-users', [App\Http\Controllers\Api\ShopUserController::class, 'index']);
    Route::post('/shop-users', [App\Http\Controllers\Api\ShopUserController::class, 'store']);
    Route::delete('/shop-users/{id}', [App\Http\Controllers\Api\ShopUserController::class, 'destroy']);
    Route::put('/shop-users/{id}', [App\Http\Controllers\Api\ShopUserController::class, 'update']);

    // Billing Routes
    Route::get('/invoices', [App\Http\Controllers\Api\InvoiceController::class, 'index']);
    Route::post('/invoices', [App\Http\Controllers\Api\InvoiceController::class, 'store']);
    Route::delete('/invoices/{id}', [App\Http\Controllers\Api\InvoiceController::class, 'destroy']);


    // Ledger Routes
    Route::get('/ledger', [App\Http\Controllers\Api\TransactionController::class, 'index']);
    Route::post('/ledger/payment', [App\Http\Controllers\Api\TransactionController::class, 'store']);

    // Staff Operations
    Route::get('/staff/status', [App\Http\Controllers\Api\StaffOpController::class, 'todayStatus']);
    Route::post('/staff/punch', [App\Http\Controllers\Api\StaffOpController::class, 'punch']);
    Route::post('/staff/worklog', [App\Http\Controllers\Api\StaffOpController::class, 'storeWorkLog']);

    // Master Viewing Staff Data
    Route::get('/staff/attendance-list', [App\Http\Controllers\Api\StaffOpController::class, 'indexAttendance']);
    Route::get('/staff/worklog-list', [App\Http\Controllers\Api\StaffOpController::class, 'indexWorkLogs']);

    // Dashboard Stats
    Route::get('/dashboard/stats', [App\Http\Controllers\Api\DashboardController::class, 'getStats']);


    // ==========================
    // DELIVERY PARTNERS
    // ==========================
    Route::get('/partners', [App\Http\Controllers\Api\DeliveryPartnerController::class, 'index']);
    Route::post('/partners', [App\Http\Controllers\Api\DeliveryPartnerController::class, 'store']);
    Route::delete('/partners/{id}', [App\Http\Controllers\Api\DeliveryPartnerController::class, 'destroy']);

    // ==========================
    // B2B ORDER SYSTEM
    // ==========================

    // Retailer Actions
    Route::get('/catalog', [App\Http\Controllers\Api\OrderController::class, 'getCatalog']); // View Items
    Route::post('/order/place', [App\Http\Controllers\Api\OrderController::class, 'placeOrder']); // Place Order
    Route::get('/order/my-history', [App\Http\Controllers\Api\OrderController::class, 'myOrders']); // Retailer History
    Route::post('/order/{id}/dispatch', [App\Http\Controllers\Api\OrderController::class, 'dispatchOrder']);

    // ==========================
    // RETURNS MANAGEMENT
    // ==========================
    Route::post('/return/request', [App\Http\Controllers\Api\ReturnController::class, 'store']); // Retailer
    Route::get('/returns', [App\Http\Controllers\Api\ReturnController::class, 'index']); // Master List
    Route::post('/return/{id}/process', [App\Http\Controllers\Api\ReturnController::class, 'approve']); // Master Action


    // Settings
    Route::get('/settings/shop', [App\Http\Controllers\Api\SettingsController::class, 'getShopDetails']);
    Route::post('/settings/shop', [App\Http\Controllers\Api\SettingsController::class, 'updateShop']);
    Route::post('/settings/password', [App\Http\Controllers\Api\SettingsController::class, 'changePassword']);

    // Master Actions
    Route::get('/order/incoming', [App\Http\Controllers\Api\OrderController::class, 'incomingOrders']); // View Retailer Orders

    Route::get('/dashboard/counts', [App\Http\Controllers\Api\DashboardController::class, 'getCounts']);

    // Master Manual Entry Routes
    Route::get('/staff-status/{id}', [App\Http\Controllers\Api\StaffOpController::class, 'getStaffStatus']);
    Route::post('/manual/punch', [App\Http\Controllers\Api\StaffOpController::class, 'manualPunch']);
    Route::post('/manual/worklog', [App\Http\Controllers\Api\StaffOpController::class, 'manualWorkLog']);
});
