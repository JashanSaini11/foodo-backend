// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// All restaurant API endpoints
// Public routes: nearby, single restaurant+menu
// Protected routes: create, update, delete (owner only)

import express from "express";
import * as restaurantController from "./restaurant.controller.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";
import menuRoutes from "./menu/menu.routes.js";
import {
  restaurantRules,
  toggleStatusRules,
  nearbyQueryRules,
  validate,
} from "./restaurant.validation.js";

const router = express.Router();

// ─── PUBLIC ROUTES ────────────────────────────────────────────

// @GET /api/restaurants/nearby?latitude=30.7&longitude=76.7&radius=5
// Returns own restaurants + Google Places merged list
/**
 * @swagger
 * /api/restaurants/nearby:
 *   get:
 *     summary: Find nearby restaurants
 *     tags: [Restaurants]
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitude coordinate
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitude coordinate
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 5
 *         description: Search radius in kilometers
 *     responses:
 *       200:
 *         description: Nearby restaurants fetched successfully
 *       400:
 *         description: Invalid coordinates
 */
router.get("/nearby", nearbyQueryRules, validate, restaurantController.getNearbyRestaurants);


// ─── OWNER PROTECTED ROUTES ───────────────────────────────────

// @GET /api/restaurants/my
// Owner sees all their restaurants
// NOTE: "my" must be before /:id so Express doesn't treat "my" as an id
/**
 * @swagger
 * /api/restaurants/my:
 *   get:
 *     summary: Get owner's restaurants
 *     tags: [Restaurants]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Owner's restaurants fetched successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (requires RESTAURANT_OWNER or ADMIN role)
 */
router.get("/my", protect, authorize("RESTAURANT_OWNER", "ADMIN"), restaurantController.getMyRestaurants);


// @GET /api/restaurants/:id/menu
// Returns restaurant details + full menu for the customer menu page
/**
 * @swagger
 * /api/restaurants/{id}/menu:
 *   get:
 *     summary: Get restaurant with full menu
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: Restaurant menu fetched successfully
 *       404:
 *         description: Restaurant not found
 */
router.get("/:id/menu", restaurantController.getRestaurantWithMenu);

// @GET /api/restaurants/:id
// Returns single restaurant info
/**
 * @swagger
 * /api/restaurants/{id}:
 *   get:
 *     summary: Get restaurant details
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: Restaurant details fetched successfully
 *       404:
 *         description: Restaurant not found
 */
router.get("/:id", restaurantController.getRestaurant);

// @POST /api/restaurants
// Create a new restaurant
/**
 * @swagger
 * /api/restaurants:
 *   post:
 *     summary: Create a new restaurant
 *     tags: [Restaurants]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RestaurantRequest'
 *     responses:
 *       201:
 *         description: Restaurant created successfully
 *       400:
 *         description: Invalid input details
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (requires RESTAURANT_OWNER or ADMIN role)
 */
router.post(
  "/",
  protect,
  authorize("RESTAURANT_OWNER", "ADMIN"),
  restaurantRules,
  validate,
  restaurantController.createRestaurant
);

// @PUT /api/restaurants/:id
// Update restaurant info
/**
 * @swagger
 * /api/restaurants/{id}:
 *   put:
 *     summary: Update restaurant
 *     tags: [Restaurants]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RestaurantRequest'
 *     responses:
 *       200:
 *         description: Restaurant updated successfully
 *       400:
 *         description: Invalid input details
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Restaurant not found
 */
router.put(
  "/:id",
  protect,
  authorize("RESTAURANT_OWNER", "ADMIN"),
  restaurantRules,
  validate,
  restaurantController.updateRestaurant
);

// @POST /api/restaurants/:id/cover-image
// Upload/replace cover image
/**
 * @swagger
 * /api/restaurants/{id}/cover-image:
 *   post:
 *     summary: Upload restaurant cover image
 *     tags: [Restaurants]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
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
 *                 description: Image file to upload (max 5MB)
 *     responses:
 *       200:
 *         description: Cover image uploaded successfully
 *       400:
 *         description: No file uploaded or invalid file format
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Restaurant not found
 */
router.post(
  "/:id/cover-image",
  protect,
  authorize("RESTAURANT_OWNER", "ADMIN"),
  restaurantController.updateCoverImage
);

// @PATCH /api/restaurants/:id/status
// Toggle open/closed status
// Body: { isOpen: true/false }
/**
 * @swagger
 * /api/restaurants/{id}/status:
 *   patch:
 *     summary: Toggle restaurant open status
 *     tags: [Restaurants]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isOpen]
 *             properties:
 *               isOpen:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Restaurant status toggled successfully
 *       400:
 *         description: Invalid status value
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Restaurant not found
 */
router.patch(
  "/:id/status",
  protect,
  authorize("RESTAURANT_OWNER", "ADMIN"),
  toggleStatusRules,
  validate,
  restaurantController.toggleOpenStatus
);

// @DELETE /api/restaurants/:id
// Delete restaurant + all its menu data
/**
 * @swagger
 * /api/restaurants/{id}:
 *   delete:
 *     summary: Delete restaurant
 *     tags: [Restaurants]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: Restaurant deleted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Restaurant not found
 */
router.delete(
  "/:id",
  protect,
  authorize("RESTAURANT_OWNER", "ADMIN"),
  restaurantController.deleteRestaurant
);

// ─── MOUNT MENU ROUTES ────────────────────────────────────────
router.use("/:restaurantId/menu", menuRoutes);

export default router; 