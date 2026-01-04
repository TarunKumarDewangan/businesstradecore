<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Category;
use App\Models\Item; // Import Item
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CategoryController extends Controller
{
    // 1. Get Categories
    public function index(Request $request)
    {
        $user = Auth::user();
        $categories = Category::where('shop_id', $user->shop_id)
            ->where('type', 'main')
            ->with('subcategories')
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

        Category::create([
            'shop_id' => $user->shop_id,
            'name' => strtoupper($request->name),
            'type' => $request->type,
            'parent_id' => $request->type === 'sub' ? $request->parent_id : null
        ]);

        return response()->json(['status' => true, 'message' => 'Category Created Successfully!']);
    }

    // 3. Update Category (NEW)
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $category = Category::where('id', $id)->where('shop_id', $user->shop_id)->first();

        if (!$category) {
            return response()->json(['status' => false, 'message' => 'Category not found'], 404);
        }

        $category->name = strtoupper($request->name);
        // We generally avoid changing 'type' or 'parent_id' to prevent breaking the tree structure easily
        $category->save();

        return response()->json(['status' => true, 'message' => 'Category Updated!']);
    }

    // 4. Delete Category (SAFER)
    public function destroy($id)
    {
        $user = Auth::user();
        $category = Category::where('id', $id)->where('shop_id', $user->shop_id)->first();

        if (!$category) {
            return response()->json(['status' => false, 'message' => 'Category not found'], 404);
        }

        // CHECK 1: Does it have subcategories?
        if ($category->subcategories()->count() > 0) {
            return response()->json(['status' => false, 'message' => 'Cannot delete: It contains sub-categories. Delete or Move them first.'], 400);
        }

        // CHECK 2: Does it have Items? (FIXED: Checks both Main AND Sub)
        $itemCount = Item::where('category_id', $id)
            ->orWhere('subcategory_id', $id) // <--- THIS WAS MISSING
            ->count();

        if ($itemCount > 0) {
            // Return 400 Error so Frontend opens the "Move Items" popup
            return response()->json(['status' => false, 'message' => 'Contains Items'], 400);
        }

        $category->delete();
        return response()->json(['status' => true, 'message' => 'Category Deleted']);
    }
    // 5. Move Items & Delete Category
    public function moveAndDelete(Request $request)
    {
        $request->validate([
            'delete_id' => 'required|exists:categories,id',
            'move_to_id' => 'required|exists:categories,id|different:delete_id'
        ]);

        $user = Auth::user();

        $catToDelete = Category::where('id', $request->delete_id)->where('shop_id', $user->shop_id)->firstOrFail();
        $catToMoveTo = Category::where('id', $request->move_to_id)->where('shop_id', $user->shop_id)->firstOrFail();

        try {
            DB::beginTransaction();

            // LOGIC: Check if target is Main or Sub
            if ($catToMoveTo->type === 'main') {
                // Moving to a Main Category -> Update category_id, Clear subcategory_id
                \App\Models\Item::where('category_id', $catToDelete->id)
                    ->orWhere('subcategory_id', $catToDelete->id)
                    ->update([
                        'category_id' => $catToMoveTo->id,
                        'subcategory_id' => null
                    ]);
            } else {
                // Moving to a Sub Category -> Update category_id to Parent, subcategory_id to Target
                \App\Models\Item::where('category_id', $catToDelete->id)
                    ->orWhere('subcategory_id', $catToDelete->id)
                    ->update([
                        'category_id' => $catToMoveTo->parent_id,
                        'subcategory_id' => $catToMoveTo->id
                    ]);
            }

            // Move any child subcategories (if deleting a main category)
            Category::where('parent_id', $catToDelete->id)
                ->update(['parent_id' => $catToMoveTo->id]);

            $catToDelete->delete();

            DB::commit();
            return response()->json(['status' => true, 'message' => 'Items Moved & Category Deleted!']);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
