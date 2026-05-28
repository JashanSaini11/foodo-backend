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
/**
 * @swagger
 * /api/cart/add:
 *   post:
 *     summary: Add item to cart
 *     tags: [Cart]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddToCartRequest'
 *     responses:
 *       200:
 *         description: Item added to cart successfully
 *       400:
 *         description: Invalid input details or restaurant mismatch
 *       401:
 *         description: Not authenticated
 */
router.post("/add", protect, addToCartRules, validate, cartController.addToCart);

// @GET /api/cart
// Returns current cart with all items and totals
/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get current cart
 *     tags: [Cart]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Cart retrieved successfully
 *       401:
 *         description: Not authenticated
 */
router.get("/", protect, cartController.getCart);

// @PUT /api/cart/update
// Body: { itemId, quantity }
// quantity = 0 removes item from cart
/**
 * @swagger
 * /api/cart/update:
 *   put:
 *     summary: Update cart item quantity
 *     tags: [Cart]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCartRequest'
 *     responses:
 *       200:
 *         description: Cart item updated successfully
 *       400:
 *         description: Invalid input details
 *       401:
 *         description: Not authenticated
 */
router.put("/update", protect, updateCartRules, validate, cartController.updateCartItem);

// @DELETE /api/cart/remove/:itemId
// Removes a specific item from cart
/**
 * @swagger
 * /api/cart/remove/{itemId}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Cart]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Food Item ID
 *     responses:
 *       200:
 *         description: Item removed from cart successfully
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Item not found in cart
 */
router.delete("/remove/:itemId", protect, cartController.removeFromCart);

// @DELETE /api/cart/clear
// Clears entire cart
/**
 * @swagger
 * /api/cart/clear:
 *   delete:
 *     summary: Clear entire cart
 *     tags: [Cart]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 *       401:
 *         description: Not authenticated
 */
router.delete("/clear", protect, cartController.clearCart);

export default router;