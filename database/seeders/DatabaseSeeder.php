<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use App\Models\Shop;
use App\Models\Attendance;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create Roles
        $roles = ['SuperAdmin', 'ShopOwner', 'Master', 'Staff', 'Retailer'];
        foreach ($roles as $role) {
            Role::create(['name' => $role]);
        }

        // 2. Create Super Admin
        User::create([
            'name' => 'Main Admin',
            'email' => 'admin@gmail.com',
            'phone' => '0000000000',
            'password' => Hash::make('password'),
            'role_id' => 1,
            'status' => 'active',
            'language' => 'en'
        ]);

        // 3. Create a Demo Shop
        $shop = Shop::create([
            'shop_name' => 'Subh Auto Demo',
            'is_active' => true
        ]);

        // 4. Create Master User (Shop Owner)
        // Login: 9876543210 / 123456
        $master = User::create([
            'name' => 'Rahul Owner',
            'phone' => '9876543210',
            'password' => Hash::make('123456'),
            'role_id' => 3,
            'shop_id' => $shop->id,
            'status' => 'active',
            'language' => 'en'
        ]);

        // 5. Create Staff User
        // Login: 1111111111 / 123456
        $staff = User::create([
            'name' => 'Raju Mechanic',
            'phone' => '1111111111',
            'password' => Hash::make('123456'),
            'role_id' => 4,
            'shop_id' => $shop->id,
            'status' => 'active',
            'language' => 'en'
        ]);

        // 6. Create Fake Attendance Data
        Attendance::create([
            'shop_id' => $shop->id,
            'user_id' => $staff->id,
            'date' => date('Y-m-d'), // Today
            'check_in' => '09:00:00',
            'status' => 'present'
        ]);

        Attendance::create([
            'shop_id' => $shop->id,
            'user_id' => $staff->id,
            'date' => date('Y-m-d', strtotime('-1 day')), // Yesterday
            'check_in' => '09:15:00',
            'check_out' => '18:30:00',
            'status' => 'present'
        ]);
    }
}
