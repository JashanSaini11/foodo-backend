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
router.get(
    "/:orderId/status",
    protect,
    paymentController.getPaymentStatus
);

export default router;