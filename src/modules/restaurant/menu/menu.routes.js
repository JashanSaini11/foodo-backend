// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// All menu API endpoints (categories + food items)
// All routes are owner-protected
// Mounted under /api/restaurants/:restaurantId/menu

import express from "express";
import * as menuController from "./menu.controller.js";
import { protect, authorize } from "../../../middlewares/auth.middleware.js";
import {
  categoryRules,
  foodItemRules,
  availabilityRules,
  validate,
} from "./menu.validation.js";

// mergeParams: true → gives access to :restaurantId from parent router
const router = express.Router({ mergeParams: true });

const ownerOrAdmin = [protect, authorize("RESTAURANT_OWNER", "ADMIN")];

// ══════════════════════════════════════════════════════════════
// CATEGORIES
// ══════════════════════════════════════════════════════════════

// @POST /api/restaurants/:restaurantId/menu/categories
// Create a new category (e.g. Starters, Main Course)
router.post("/categories", ...ownerOrAdmin, categoryRules, validate, menuController.createCategory);

// @GET /api/restaurants/:restaurantId/menu/categories
// Get all categories — public (used by customer menu page)
router.get("/categories", menuController.getCategories);

// @PUT /api/restaurants/:restaurantId/menu/categories/:categoryId
// Update category name, description, sort order
router.put("/categories/:categoryId", ...ownerOrAdmin, categoryRules, validate, menuController.updateCategory);

// @DELETE /api/restaurants/:restaurantId/menu/categories/:categoryId
// Delete category + all its food items
router.delete("/categories/:categoryId", ...ownerOrAdmin, menuController.deleteCategory);

// ══════════════════════════════════════════════════════════════
// FOOD ITEMS
// ══════════════════════════════════════════════════════════════

// @POST /api/restaurants/:restaurantId/menu/items
// Add a new food item to a category
router.post("/items", ...ownerOrAdmin, foodItemRules, validate, menuController.addFoodItem);

// @GET /api/restaurants/:restaurantId/menu/items
// Get all items (owner view — includes unavailable items)
router.get("/items", ...ownerOrAdmin, menuController.getFoodItems);

// @PUT /api/restaurants/:restaurantId/menu/items/:itemId
// Update food item details
router.put("/items/:itemId", ...ownerOrAdmin, foodItemRules, validate, menuController.updateFoodItem);

// @POST /api/restaurants/:restaurantId/menu/items/:itemId/image
// Upload food item image to Cloudinary
router.post("/items/:itemId/image", ...ownerOrAdmin, menuController.updateFoodItemImage);

// @PATCH /api/restaurants/:restaurantId/menu/items/:itemId/availability
// Toggle item available/unavailable (quick toggle for owner dashboard)
// Body: { isAvailable: true/false }
router.patch("/items/:itemId/availability", ...ownerOrAdmin, availabilityRules, validate, menuController.toggleItemAvailability);

// @DELETE /api/restaurants/:restaurantId/menu/items/:itemId
// Delete food item + its Cloudinary image
router.delete("/items/:itemId", ...ownerOrAdmin, menuController.deleteFoodItem);

export default router;