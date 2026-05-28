// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// All order related API endpoints
// User routes: place, view, cancel orders
// Restaurant routes: view + update incoming orders

import express from "express";
import * as orderController from "./order.controller.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";
import {
    placeOrderRules,
    updateStatusRules,
    verifyOTPRules,
    cancelOrderRules,
    validate,
} from "./order.validation.js";

const router = express.Router();

// ─── USER ORDER ROUTES ────────────────────────────────────────

// @POST /api/orders
// Place a new order from cart
// Body: { addressId, paymentMethod, specialInstructions? }
/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Place a new order
 *     tags: [Orders]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PlaceOrderRequest'
 *     responses:
 *       201:
 *         description: Order placed successfully
 *       400:
 *         description: Cart is empty or invalid address details
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied. Only USER can perform this action.
 */
router.post(
    "/",
    protect,
    authorize("USER"),
    placeOrderRules,
    validate,
    orderController.placeOrder
);

// @GET /api/orders
// Get my order history (paginated)
// Query: ?page=1&limit=10
/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get order history
 *     tags: [Orders]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Order history retrieved successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied. Only USER can perform this action.
 */
router.get(
    "/",
    protect,
    authorize("USER"),
    orderController.getMyOrders
);

// ─── RESTAURANT ORDER ROUTES ──────────────────────────────────
// ⚠️ Specific routes BEFORE dynamic /:id routes

// @GET /api/orders/restaurant/:restaurantId
// Restaurant owner sees all incoming orders
// Query: ?status=PENDING&page=1
/**
 * @swagger
 * /api/orders/restaurant/{restaurantId}:
 *   get:
 *     summary: Get restaurant orders
 *     tags: [Orders]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by order status (e.g. PENDING, PREPARING, etc.)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *     responses:
 *       200:
 *         description: Restaurant orders retrieved successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (requires RESTAURANT_OWNER or ADMIN role)
 */
router.get(
    "/restaurant/:restaurantId",
    protect,
    authorize("RESTAURANT_OWNER", "ADMIN"),
    orderController.getRestaurantOrders
);

// ─── DYNAMIC ORDER ROUTES ─────────────────────────────────────

// @GET /api/orders/:id
// Get single order details
/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get single order details
 *     tags: [Orders]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details retrieved successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied. Only USER can perform this action.
 *       404:
 *         description: Order not found
 */
router.get(
    "/:id",
    protect,
    authorize("USER"),
    orderController.getOrderById
);

// @POST /api/orders/:id/cancel
// Cancel a pending order
// Body: { reason? }
/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   post:
 *     summary: Cancel a pending order
 *     tags: [Orders]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CancelOrderRequest'
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *       400:
 *         description: Order cannot be cancelled (e.g. already preparing/delivered)
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied. Only USER can perform this action.
 *       404:
 *         description: Order not found
 */
router.post(
    "/:id/cancel",
    protect,
    authorize("USER"),
    cancelOrderRules,
    validate,
    orderController.cancelOrder
);

// @PATCH /api/orders/:id/status
// Restaurant updates order status
// Body: { status, restaurantId }
/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     tags: [Orders]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateOrderStatusRequest'
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *       400:
 *         description: Invalid status or validation errors
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Order not found
 */
router.patch(
    "/:id/status",
    protect,
    authorize("RESTAURANT_OWNER", "ADMIN", "DELIVERY_PARTNER"),
    updateStatusRules,
    validate,
    orderController.updateOrderStatus
);

// @POST /api/orders/:id/verify-otp
// Delivery partner verifies OTP to confirm delivery
// Body: { otp }
/**
 * @swagger
 * /api/orders/{id}/verify-otp:
 *   post:
 *     summary: Verify delivery OTP
 *     tags: [Orders]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyOrderOTPRequest'
 *     responses:
 *       200:
 *         description: Order delivered and verified successfully
 *       400:
 *         description: Invalid OTP value
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (requires DELIVERY_PARTNER or ADMIN role)
 *       404:
 *         description: Order not found
 */
router.post(
    "/:id/verify-otp",
    protect,
    authorize("DELIVERY_PARTNER", "ADMIN"),
    verifyOTPRules,
    validate,
    orderController.verifyDeliveryOTP
);

export default router;