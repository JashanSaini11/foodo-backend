// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// All business logic for menu management
// Handles: categories CRUD + food item CRUD
// Always verifies the restaurant belongs to the requesting owner

import { MenuCategory, FoodItem } from "./menu.model.js";
import Restaurant from "../restaurant.model.js";
import { deleteImage } from "../../../config/cloudinary.js";
import { deleteCache } from "../../../config/redis.js";

// ─── HELPER: verify ownership ─────────────────────────────────
const verifyOwnership = async (ownerId, restaurantId) => {
  const restaurant = await Restaurant.findOne({ _id: restaurantId, ownerId });
  if (!restaurant) {
    throw { statusCode: 403, message: "Restaurant not found or access denied." };
  }
  return restaurant;
};
m     
// ─── INVALIDATE MENU CACHE ────────────────────────────────────
// Called after any menu change so users get fresh data
const invalidateMenuCache = async (restaurantId) => {
  await deleteCache(`restaurant_menu:${restaurantId}`);
};

// ══════════════════════════════════════════════════════════════
// MENU CATEGORIES
// ══════════════════════════════════════════════════════════════

// ─── CREATE CATEGORY ─────────────────────────────────────────
export const createCategory = async (ownerId, restaurantId, data) => {
  await verifyOwnership(ownerId, restaurantId);

  const category = await MenuCategory.create({
    restaurantId,
    ...data,
  });

  await invalidateMenuCache(restaurantId);

  return {
    message: "Category created successfully.",
    category,
  };
};

// ─── GET ALL CATEGORIES ───────────────────────────────────────
export const getCategories = async (restaurantId) => {
  const categories = await MenuCategory.find({ restaurantId }).sort({ sortOrder: 1 });
  return categories;
};

// ─── UPDATE CATEGORY ─────────────────────────────────────────
export const updateCategory = async (ownerId, restaurantId, categoryId, data) => {
  await verifyOwnership(ownerId, restaurantId);

  const updated = await MenuCategory.findOneAndUpdate(
    { _id: categoryId, restaurantId },
    { $set: data },
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw { statusCode: 404, message: "Category not found." };
  }

  await invalidateMenuCache(restaurantId);

  return {
    message: "Category updated successfully.",
    category: updated,
  };
};

// ─── DELETE CATEGORY ──────────────────────────────────────────
// Also removes all food items in this category
export const deleteCategory = async (ownerId, restaurantId, categoryId) => {
  await verifyOwnership(ownerId, restaurantId);

  const category = await MenuCategory.findOne({ _id: categoryId, restaurantId });
  if (!category) {
    throw { statusCode: 404, message: "Category not found." };
  }

  // Delete all food items in this category
  await FoodItem.deleteMany({ categoryId });
  await MenuCategory.findByIdAndDelete(categoryId);

  await invalidateMenuCache(restaurantId);

  return { message: "Category and all its items deleted successfully." };
};

// ══════════════════════════════════════════════════════════════
// FOOD ITEMS
// ══════════════════════════════════════════════════════════════

// ─── ADD FOOD ITEM ────────────────────────────────────────────
export const addFoodItem = async (ownerId, restaurantId, data) => {
  await verifyOwnership(ownerId, restaurantId);

  // Verify the category belongs to this restaurant
  const category = await MenuCategory.findOne({
    _id: data.categoryId,
    restaurantId,
  });
  if (!category) {
    throw { statusCode: 404, message: "Category not found for this restaurant." };
  }

  const item = await FoodItem.create({ restaurantId, ...data });

  await invalidateMenuCache(restaurantId);

  return {
    message: "Food item added successfully.",
    item,
  };
};

// ─── GET FOOD ITEMS BY RESTAURANT ─────────────────────────────
// Owner view — shows all items including unavailable ones
export const getFoodItems = async (restaurantId) => {
  const items = await FoodItem.find({ restaurantId })
    .populate("categoryId", "name")
    .sort({ createdAt: -1 });
  return items;
};

// ─── UPDATE FOOD ITEM ─────────────────────────────────────────
export const updateFoodItem = async (ownerId, restaurantId, itemId, data) => {
  await verifyOwnership(ownerId, restaurantId);

  const updated = await FoodItem.findOneAndUpdate(
    { _id: itemId, restaurantId },
    { $set: data },
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw { statusCode: 404, message: "Food item not found." };
  }

  await invalidateMenuCache(restaurantId);

  return {
    message: "Food item updated successfully.",
    item: updated,
  };
};

// ─── UPDATE FOOD ITEM IMAGE ───────────────────────────────────
export const updateFoodItemImage = async (ownerId, restaurantId, itemId, file) => {
  if (!file) {
    throw { statusCode: 400, message: "No image file provided." };
  }

  await verifyOwnership(ownerId, restaurantId);

  const item = await FoodItem.findOne({ _id: itemId, restaurantId });
  if (!item) {
    throw { statusCode: 404, message: "Food item not found." };
  }

  // Delete old image from Cloudinary
  if (item.image) {
    const publicId = `foodo/food_items/item_${itemId}`;
    await deleteImage(publicId);
  }

  item.image = file.path;
  await item.save();

  await invalidateMenuCache(restaurantId);

  return {
    message: "Food item image updated successfully.",
    image: item.image,
  };
};

// ─── TOGGLE ITEM AVAILABILITY ─────────────────────────────────
// Quick toggle without full update — used by owner dashboard
export const toggleItemAvailability = async (ownerId, restaurantId, itemId, isAvailable) => {
  await verifyOwnership(ownerId, restaurantId);

  const item = await FoodItem.findOneAndUpdate(
    { _id: itemId, restaurantId },
    { isAvailable },
    { new: true }
  );

  if (!item) {
    throw { statusCode: 404, message: "Food item not found." };
  }

  await invalidateMenuCache(restaurantId);

  return {
    message: `Item is now ${isAvailable ? "available" : "unavailable"}.`,
    isAvailable: item.isAvailable,
  };
};

// ─── DELETE FOOD ITEM ─────────────────────────────────────────
export const deleteFoodItem = async (ownerId, restaurantId, itemId) => {
  await verifyOwnership(ownerId, restaurantId);

  const item = await FoodItem.findOne({ _id: itemId, restaurantId });
  if (!item) {
    throw { statusCode: 404, message: "Food item not found." };
  }

  // Clean up image from Cloudinary
  if (item.image) {
    const publicId = `foodo/food_items/item_${itemId}`;
    await deleteImage(publicId);
  }

  await FoodItem.findByIdAndDelete(itemId);

  await invalidateMenuCache(restaurantId);

  return { message: "Food item deleted successfully." };
};