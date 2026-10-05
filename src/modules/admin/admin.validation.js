// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Validates request bodies for admin endpoints

import { body, validationResult } from "express-validator";
import { errorResponse } from "../../utils/response.js";

// ─── TOGGLE STATUS RULES ──────────────────────────────────────
export const toggleStatusRules = [
    body("isActive")
        .exists().withMessage("isActive is required")
        .isBoolean().withMessage("isActive must be true or false"),
];

// ─── VERIFY RULES ─────────────────────────────────────────────
export const verifyRules = [
    body("isVerified")
        .exists().withMessage("isVerified is required")
        .isBoolean().withMessage("isVerified must be true or false"),
];

// ─── CHANGE ROLE RULES ────────────────────────────────────────
export const changeRoleRules = [
    body("role")
        .exists().withMessage("Role is required")
        .notEmpty().withMessage("Role cannot be empty")
        .isIn(["USER", "RESTAURANT_OWNER", "DELIVERY_PARTNER", "ADMIN"]) 
        .withMessage("Invalid role"),
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