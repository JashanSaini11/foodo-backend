// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// All restaurant API endpoints
// Public routes: nearby, single restaurant+menu
// Protected routes: create, update, delete (owner only)

import express from "express";
import * as restaurantController from "./restaurant.controller.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";
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
router.get("/nearby", nearbyQueryRules, validate, restaurantController.getNearbyRestaurants);

// @GET /api/restaurants/:id/menu
// Returns restaurant details + full menu for the customer menu page
router.get("/:id/menu", restaurantController.getRestaurantWithMenu);

// @GET /api/restaurants/:id
// Returns single restaurant info
router.get("/:id", restaurantController.getRestaurant);

// ─── OWNER PROTECTED ROUTES ───────────────────────────────────

// @GET /api/restaurants/my
// Owner sees all their restaurants
// NOTE: "my" must be before /:id so Express doesn't treat "my" as an id
router.get("/my", protect, authorize("RESTAURANT_OWNER", "ADMIN"), restaurantController.getMyRestaurants);

// @POST /api/restaurants
// Create a new restaurant
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
router.post(
  "/:id/cover-image",
  protect,
  authorize("RESTAURANT_OWNER", "ADMIN"),
  restaurantController.updateCoverImage
);

// @PATCH /api/restaurants/:id/status
// Toggle open/closed status
// Body: { isOpen: true/false }
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
router.delete(
  "/:id",
  protect,
  authorize("RESTAURANT_OWNER", "ADMIN"),
  restaurantController.deleteRestaurant
);

export default router; 