// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Handles HTTP requests for cart operations
// All routes are protected — user must be logged in

import * as cartService from "./cart.service.js";
import { successResponse, errorResponse } from "../../../utils/response.js";

// ─── ADD TO CART ──────────────────────────────────────────────
// POST /api/cart/add
// Body: { itemId, quantity?, customizations? }
export const addToCart = async (req, res) => {
  try {
    const result = await cartService.addToCart(req.user.id, req.body);
    return successResponse(res, {
      statusCode: 200,
      message: result.message,
      data: { cart: result.cart },
    });
  } catch (err) {
    return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
  }
};

// ─── GET CART ─────────────────────────────────────────────────
// GET /api/cart
export const getCart = async (req, res) => {
  try {
    const result = await cartService.getCart(req.user.id);
    return successResponse(res, {
      statusCode: 200,
      message: result.isEmpty ? "Cart is empty." : "Cart fetched successfully.",
      data: result,
    });
  } catch (err) {
    return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
  }
};

// ─── UPDATE CART ITEM ─────────────────────────────────────────
// PUT /api/cart/update
// Body: { itemId, quantity }
// quantity = 0 → removes item
export const updateCartItem = async (req, res) => {
  try {
    const { itemId, quantity } = req.body;
    const result = await cartService.updateCartItem(req.user.id, itemId, quantity);
    return successResponse(res, {
      statusCode: 200,
      message: result.message,
      data: { cart: result.cart },
    });
  } catch (err) {
    return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
  }
};

// ─── REMOVE FROM CART ─────────────────────────────────────────
// DELETE /api/cart/remove/:itemId
export const removeFromCart = async (req, res) => {
  try {
    const result = await cartService.removeFromCart(req.user.id, req.params.itemId);
    return successResponse(res, {
      statusCode: 200,
      message: result.message,
      data: { cart: result.cart },
    });
  } catch (err) {
    return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
  }
};

// ─── CLEAR CART ───────────────────────────────────────────────
// DELETE /api/cart/clear
export const clearCart = async (req, res) => {
  try {
    const result = await cartService.clearCart(req.user.id);
    return successResponse(res, {
      statusCode: 200,
      message: result.message,
      data: null,
    });
  } catch (err) {
    return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
  }
};