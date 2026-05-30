// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// All payment related API endpoints
// Works with Razorpay for online payments

import express from "express";
import * as paymentController from "./payment.controller.js";
import { protect } from "../../../middlewares/auth.middleware.js";
import { body, validationResult } from "express-validator";
import { errorResponse } from "../../../utils/response.js";

const router = express.Router();

// ─── VALIDATION ───────────────────────────────────────────────
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return errorResponse(res, {
            statusCode: 422,
            message: "Validation failed.",
            errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
        });
    }
    next();
};

// @POST /api/payments/create
// Creates Razorpay order → returns order id for frontend checkout
// Body: { orderId }
/**
 * @swagger
 * /api/payments/create:
 *   post:
 *     summary: Create a Razorpay order for checkout
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId]
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: Internal order ID
 *     responses:
 *       200:
 *         description: Razorpay order created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 */
router.post(
    "/create",
    protect,
    [body("orderId").notEmpty().withMessage("Order ID is required")],
    validate,
    paymentController.createPaymentOrder
);

// @POST /api/payments/verify
// Verifies Razorpay payment signature after successful payment
// Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId }
/**
 * @swagger
 * /api/payments/verify:
 *   post:
 *     summary: Verify Razorpay payment signature
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId]
 *             properties:
 *               razorpayOrderId:
 *                 type: string
 *               razorpayPaymentId:
 *                 type: string
 *               razorpaySignature:
 *                 type: string
 *               orderId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment verified successfully
 *       400:
 *         description: Invalid signature or missing fields
 *       401:
 *         description: Not authenticated
 */
router.post(
    "/verify",
    protect,
    [
        body("razorpayOrderId").notEmpty().withMessage("Razorpay order ID is required"),
        body("razorpayPaymentId").notEmpty().withMessage("Razorpay payment ID is required"),
        body("razorpaySignature").notEmpty().withMessage("Razorpay signature is required"),
        body("orderId").notEmpty().withMessage("Order ID is required"),
    ],
    validate,
    paymentController.verifyPayment
);

// @GET /api/payments/:orderId/status
// Check payment status of an order
/**
 * @swagger
 * /api/payments/{orderId}/status:
 *   get:
 *     summary: Get payment status for an order
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Internal Order ID
 *     responses:
 *       200:
 *         description: Payment status retrieved successfully
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Order not found
 */
router.get(
    "/:orderId/status",
    protect,
    paymentController.getPaymentStatus
);

export default router;