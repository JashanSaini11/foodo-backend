// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Handles HTTP requests for order management
// Thin layer — reads request, calls service, sends response

import * as orderService from "./order.service.js";
import { successResponse, errorResponse } from "../../utils/response.js";

// ─── PLACE ORDER ──────────────────────────────────────────────
// POST /api/orders
// Body: { addressId, paymentMethod, specialInstructions? }
export const placeOrder = async (req, res) => {
    try {
        const result = await orderService.placeOrder(req.user.id, req.body);
        return successResponse(res, {
            statusCode: 201,
            message: result.message,
            data: { order: result.order },
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// ─── GET MY ORDERS ────────────────────────────────────────────
// GET /api/orders?page=1&limit=10
export const getMyOrders = async (req, res) => {
    try {
        const { page, limit } = req.query;
        const result = await orderService.getMyOrders(req.user.id, {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
        });
        return successResponse(res, {
            statusCode: 200,
            message: "Orders fetched successfully.",
            data: result,
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// ─── GET SINGLE ORDER ─────────────────────────────────────────
// GET /api/orders/:id
export const getOrderById = async (req, res) => {
    try {
        const order = await orderService.getOrderById(req.user.id, req.params.id);
        return successResponse(res, {
            statusCode: 200,
            message: "Order fetched successfully.",
            data: { order },
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// ─── CANCEL ORDER ─────────────────────────────────────────────
// POST /api/orders/:id/cancel
// Body: { reason? }
export const cancelOrder = async (req, res) => {
    try {
        const result = await orderService.cancelOrder(
            req.user.id,
            req.params.id,
            req.body.reason
        );
        return successResponse(res, {
            statusCode: 200,
            message: result.message,
            data: { order: result.order },
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// ─── GET RESTAURANT ORDERS ────────────────────────────────────
// GET /api/orders/restaurant/:restaurantId?status=PENDING&page=1
export const getRestaurantOrders = async (req, res) => {
    try {
        const { status, page, limit } = req.query;
        const result = await orderService.getRestaurantOrders(
            req.params.restaurantId,
            {
                status,
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
            }
        );
        return successResponse(res, {
            statusCode: 200,
            message: "Restaurant orders fetched.",
            data: result,
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// ─── UPDATE ORDER STATUS ──────────────────────────────────────
// PATCH /api/orders/:id/status
// Body: { status }
export const updateOrderStatus = async (req, res) => {
    try {
        const result = await orderService.updateOrderStatus(
            req.body.restaurantId,
            req.params.id,
            req.body.status
        );
        return successResponse(res, {
            statusCode: 200,
            message: result.message,
            data: { order: result.order },
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// ─── VERIFY DELIVERY OTP ──────────────────────────────────────
// POST /api/orders/:id/verify-otp
// Body: { otp }
export const verifyDeliveryOTP = async (req, res) => {
    try {
        const result = await orderService.verifyDeliveryOTP(
            req.params.id,
            req.body.otp
        );
        return successResponse(res, {
            statusCode: 200,
            message: result.message,
            data: { order: result.order },
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};