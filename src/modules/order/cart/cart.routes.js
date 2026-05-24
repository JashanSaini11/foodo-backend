// src/modules/order/cart.routes.js

// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// All cart API endpoints
// All routes are protected — user must be logged in

import express from "express";
import * as cartController from "./cart.controller.js";
import { protect } from "../../../middlewares/auth.middleware.js";
import { addToCartRules, updateCartRules, validate } from "./cart.validation.js";

const router = express.Router();

// ─── ALL CART ROUTES REQUIRE LOGIN ────────────────────────────

// @POST /api/cart/add
// Body: { itemId, quantity?, customizations? }
// Adds item to cart — clears cart if different restaurant
router.post("/add", protect, addToCartRules, validate, cartController.addToCart);

// @GET /api/cart
// Returns current cart with all items and totals
router.get("/", protect, cartController.getCart);

// @PUT /api/cart/update
// Body: { itemId, quantity }
// quantity = 0 removes item from cart
router.put("/update", protect, updateCartRules, validate, cartController.updateCartItem);

// @DELETE /api/cart/remove/:itemId
// Removes a specific item from cart
router.delete("/remove/:itemId", protect, cartController.removeFromCart);

// @DELETE /api/cart/clear
// Clears entire cart
router.delete("/clear", protect, cartController.clearCart);

export default router;