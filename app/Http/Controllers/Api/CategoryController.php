<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Category;
use Illuminate\Support\Facades\Auth;

class CategoryController extends Controller
{
    // 1. Get Categories (Only for the logged-in user's shop)
    public function index(Request $request)
    {
        $user = Auth::user(); // Get logged in user

        // Fetch Main Categories with their Subcategories
        $categories = Category::where('shop_id', $user->shop_id)
            ->where('type', 'main')
            ->with('subcategories') // We need to define this relationship in Model next
            ->get();

        return response()->json(['status' => true, 'data' => $categories]);
    }

    // 2. Create Category
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required',
            'type' => 'required|in:main,sub',
            'parent_id' => 'nullable|exists:categories,id'
        ]);

        $user = Auth::user();

        $category = new Category();
        $category->shop_id = $user->shop_id;
        $category->name = $request->name;
        $category->type = $request->type;
        if ($request->type === 'sub') {
            $category->parent_id = $request->parent_id;
        }
        $category->save();

        return response()->json(['status' => true, 'message' => 'Category Created Successfully!']);
    }

    // 3. Delete Category
    public function destroy($id)
    {
        $category = Category::find($id);
        if (!$category) {
            return response()->json(['status' => false, 'message' => 'Category not found'], 404);
        }

        // Security Check: Does this category belong to the user's shop?
        if ($category->shop_id !== Auth::user()->shop_id) {
            return response()->json(['status' => false, 'message' => 'Unauthorized'], 403);
        }

        $category->delete();
        return response()->json(['status' => true, 'message' => 'Category Deleted']);
    }
}
