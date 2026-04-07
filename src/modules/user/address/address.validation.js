
// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Validates request body for all address endpoints
// Ensures lat/lng, pincode, label etc are correct before hitting service

import { body, param, query, validationResult } from "express-validator";
import { errorResponse } from "../../../utils/response.js";

// ─── ADD / UPDATE ADDRESS RULES ───────────────────────────────
export const addressRules = [
    body("label")
        .trim()
        .notEmpty().withMessage("Label is required")
        .isIn(["Home", "Work", "Other"]).withMessage("Label must be Home, Work or Other"),

    body("addressLine1")
        .trim()
        .notEmpty().withMessage("Address line 1 is required")
        .isLength({ min: 5, max: 100 }).withMessage("Address must be 5–100 characters"),

    body("addressLine2")
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage("Address line 2 max 100 characters"),

    body("city")
        .trim()
        .notEmpty().withMessage("City is required"),

    body("state")
        .trim()
        .notEmpty().withMessage("State is required"),

    body("pincode")
        .trim()
        .notEmpty().withMessage("Pincode is required")
        .matches(/^[1-9][0-9]{5}$/).withMessage("Please enter a valid 6-digit pincode"),

    body("latitude")
        .notEmpty().withMessage("Latitude is required")
        .isFloat({ min: -90, max: 90 }).withMessage("Invalid latitude"),

    body("longitude")
        .notEmpty().withMessage("Longitude is required")
        .isFloat({ min: -180, max: 180 }).withMessage("Invalid longitude"),
];

// ─── PINCODE QUERY RULE ───────────────────────────────────────
export const pincodeRules = [
    query("pincode")
        .notEmpty().withMessage("Pincode is required")
        .matches(/^[1-9][0-9]{5}$/).withMessage("Please enter a valid 6-digit pincode"),
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