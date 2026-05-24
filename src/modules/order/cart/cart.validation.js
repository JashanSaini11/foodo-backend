// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Validates cart request bodies

import { body, validationResult } from "express-validator";
import { errorResponse } from "../../../utils/response.js";

// ─── ADD TO CART RULES ────────────────────────────────────────
export const addToCartRules = [
    body("itemId")
        .notEmpty().withMessage("Item ID is required")
        .isString().withMessage("Invalid item ID"),

    body("quantity")
        .optional()
        .isInt({ min: 1, max: 10 }).withMessage("Quantity must be between 1 and 10"),

    body("customizations")
        .optional()
        .isArray().withMessage("Customizations must be an array"),
];

// ─── UPDATE CART RULES ────────────────────────────────────────
export const updateCartRules = [
    body("itemId")
        .notEmpty().withMessage("Item ID is required")
        .isString().withMessage("Invalid item ID"),

    body("quantity")
        .notEmpty().withMessage("Quantity is required")
        .isInt({ min: 0, max: 10 }).withMessage("Quantity must be between 0 and 10"),
    // 0 = remove item
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