// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Handles HTTP requests for payment operations

import * as paymentService from "./payment.service.js";
import { successResponse, errorResponse } from "../../../utils/response.js";

// ─── CREATE PAYMENT ORDER ─────────────────────────────────────
// POST /api/payments/create
// Body: { orderId }
export const createPaymentOrder = async (req, res) => {
    try {
        const result = await paymentService.createPaymentOrder(
            req.user.id,
            req.body.orderId
        );
        return successResponse(res, {
            statusCode: 201,
            message: result.message,
            data: result.payment,
        });
    } catch (err) {
        console.error("Create payment order error:", err);
        const message = err.message || (err.error && err.error.description) || "Internal Server Error";
        return errorResponse(res, { statusCode: err.statusCode || 500, message });
    }
};

// ─── VERIFY PAYMENT ───────────────────────────────────────────
// POST /api/payments/verify
// Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId }
export const verifyPayment = async (req, res) => {
    try {
        const result = await paymentService.verifyPayment(req.user.id, req.body);
        return successResponse(res, {
            statusCode: 200,
            message: result.message,
            data: { order: result.order },
        });
    } catch (err) {
        console.error("Verify payment error:", err);
        const message = err.message || (err.error && err.error.description) || "Internal Server Error";
        return errorResponse(res, { statusCode: err.statusCode || 500, message });
    }
};

// ─── GET PAYMENT STATUS ───────────────────────────────────────
// GET /api/payments/:orderId/status
export const getPaymentStatus = async (req, res) => {
    try {
        const order = await paymentService.getPaymentStatus(
            req.user.id,
            req.params.orderId
        );
        return successResponse(res, {
            statusCode: 200,
            message: "Payment status fetched.",
            data: { order },
        });
    } catch (err) {
        console.error("Get payment status error:", err);
        const message = err.message || (err.error && err.error.description) || "Internal Server Error";
        return errorResponse(res, { statusCode: err.statusCode || 500, message });
    }
};