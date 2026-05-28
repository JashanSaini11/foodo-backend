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
/**
 * @swagger
 * /api/restaurants/{restaurantId}/menu/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Menu]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryRequest'
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Invalid input details
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Restaurant not found
 */
router.post("/categories", ...ownerOrAdmin, categoryRules, validate, menuController.createCategory);

// @GET /api/restaurants/:restaurantId/menu/categories
// Get all categories — public (used by customer menu page)
/**
 * @swagger
 * /api/restaurants/{restaurantId}/menu/categories:
 *   get:
 *     summary: Get all menu categories
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: Categories fetched successfully
 *       404:
 *         description: Restaurant not found
 */
router.get("/categories", menuController.getCategories);

// @PUT /api/restaurants/:restaurantId/menu/categories/:categoryId
// Update category name, description, sort order
/**
 * @swagger
 * /api/restaurants/{restaurantId}/menu/categories/{categoryId}:
 *   put:
 *     summary: Update a category
 *     tags: [Menu]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryRequest'
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Invalid input details
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Restaurant or category not found
 */
router.put("/categories/:categoryId", ...ownerOrAdmin, categoryRules, validate, menuController.updateCategory);

// @DELETE /api/restaurants/:restaurantId/menu/categories/:categoryId
// Delete category + all its food items
/**
 * @swagger
 * /api/restaurants/{restaurantId}/menu/categories/{categoryId}:
 *   delete:
 *     summary: Delete category and its food items
 *     tags: [Menu]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Restaurant or category not found
 */
router.delete("/categories/:categoryId", ...ownerOrAdmin, menuController.deleteCategory);

// ══════════════════════════════════════════════════════════════
// FOOD ITEMS
// ══════════════════════════════════════════════════════════════

// @POST /api/restaurants/:restaurantId/menu/items
// Add a new food item to a category
/**
 * @swagger
 * /api/restaurants/{restaurantId}/menu/items:
 *   post:
 *     summary: Add a new food item
 *     tags: [Menu]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FoodItemRequest'
 *     responses:
 *       201:
 *         description: Food item added successfully
 *       400:
 *         description: Invalid input details
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Restaurant not found
 */
router.post("/items", ...ownerOrAdmin, foodItemRules, validate, menuController.addFoodItem);

// @GET /api/restaurants/:restaurantId/menu/items
// Get all items (owner view — includes unavailable items)
/**
 * @swagger
 * /api/restaurants/{restaurantId}/menu/items:
 *   get:
 *     summary: Get all food items
 *     tags: [Menu]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: Food items fetched successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Restaurant not found
 */
router.get("/items", ...ownerOrAdmin, menuController.getFoodItems);

// @PUT /api/restaurants/:restaurantId/menu/items/:itemId
// Update food item details
/**
 * @swagger
 * /api/restaurants/{restaurantId}/menu/items/{itemId}:
 *   put:
 *     summary: Update food item details
 *     tags: [Menu]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Food Item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FoodItemRequest'
 *     responses:
 *       200:
 *         description: Food item updated successfully
 *       400:
 *         description: Invalid input details
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Restaurant or item not found
 */
router.put("/items/:itemId", ...ownerOrAdmin, foodItemRules, validate, menuController.updateFoodItem);

// @POST /api/restaurants/:restaurantId/menu/items/:itemId/image
// Upload food item image to Cloudinary
/**
 * @swagger
 * /api/restaurants/{restaurantId}/menu/items/{itemId}/image:
 *   post:
 *     summary: Upload food item image
 *     tags: [Menu]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Food Item ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload (max 3MB)
 *     responses:
 *       200:
 *         description: Food item image uploaded successfully
 *       400:
 *         description: No file uploaded or invalid file format
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Restaurant or item not found
 */
router.post("/items/:itemId/image", ...ownerOrAdmin, menuController.updateFoodItemImage);

// @PATCH /api/restaurants/:restaurantId/menu/items/:itemId/availability
// Toggle item available/unavailable (quick toggle for owner dashboard)
// Body: { isAvailable: true/false }
/**
 * @swagger
 * /api/restaurants/{restaurantId}/menu/items/{itemId}/availability:
 *   patch:
 *     summary: Toggle food item availability
 *     tags: [Menu]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Food Item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isAvailable]
 *             properties:
 *               isAvailable:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Availability toggled successfully
 *       400:
 *         description: Invalid availability value
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Restaurant or item not found
 */
router.patch("/items/:itemId/availability", ...ownerOrAdmin, availabilityRules, validate, menuController.toggleItemAvailability);

// @DELETE /api/restaurants/:restaurantId/menu/items/:itemId
// Delete food item + its Cloudinary image
/**
 * @swagger
 * /api/restaurants/{restaurantId}/menu/items/{itemId}:
 *   delete:
 *     summary: Delete a food item
 *     tags: [Menu]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Food Item ID
 *     responses:
 *       200:
 *         description: Food item deleted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Restaurant or item not found
 */
router.delete("/items/:itemId", ...ownerOrAdmin, menuController.deleteFoodItem);

export default router;