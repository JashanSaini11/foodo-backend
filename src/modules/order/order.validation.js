// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Validates request bodies for order endpoints

import { body, validationResult } from "express-validator";
import { errorResponse } from "../../utils/response.js";

// ─── PLACE ORDER RULES ────────────────────────────────────────
export const placeOrderRules = [
    body("addressId")
        .notEmpty().withMessage("Delivery address is required")
        .isString().withMessage("Invalid address ID"),

    body("paymentMethod")
        .notEmpty().withMessage("Payment method is required")
        .isIn(["RAZORPAY", "STRIPE", "CASH_ON_DELIVERY"])
        .withMessage("Payment method must be RAZORPAY, STRIPE or CASH_ON_DELIVERY"),

    body("specialInstructions")
        .optional()
        .trim()
        .isLength({ max: 200 }).withMessage("Special instructions max 200 characters"),
];

// ─── UPDATE ORDER STATUS RULES ────────────────────────────────
export const updateStatusRules = [
    body("status")
        .notEmpty().withMessage("Status is required")
        .isIn(["ACCEPTED", "REJECTED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"])
        .withMessage("Invalid order status"),

    body("restaurantId")
        .notEmpty().withMessage("Restaurant ID is required"),
];

// ─── VERIFY OTP RULES ─────────────────────────────────────────
export const verifyOTPRules = [
    body("otp")
        .notEmpty().withMessage("OTP is required")
        .isLength({ min: 4, max: 4 }).withMessage("OTP must be 4 digits")
        .isNumeric().withMessage("OTP must be numeric"),
];

// ─── CANCEL ORDER RULES ───────────────────────────────────────
export const cancelOrderRules = [
    body("reason")
        .optional()
        .trim()
        .isLength({ max: 200 }).withMessage("Reason max 200 characters"),
];

// ─── VALIDATION RESULT CHECKER ────────────────────────────────
export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return errorResponse(res, {
            statusCode: 422,
            message: "Validation failed.",
            errors: errors.array().map((e) => ({
                field: e.path,
                message: e.msg,
            })),
        });
    }
    next();
};