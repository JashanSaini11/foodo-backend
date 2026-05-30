// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Validates request bodies for delivery partner endpoints

import { body, validationResult } from "express-validator";
import { errorResponse } from "../../utils/response.js";

// ─── REGISTER PARTNER RULES ───────────────────────────────────
export const registerRules = [
    body("vehicleType")
        .trim()
        .notEmpty().withMessage("Vehicle type is required")
        .isIn(["BIKE", "SCOOTER", "BICYCLE", "CAR"])
        .withMessage("Vehicle type must be BIKE, SCOOTER, BICYCLE or CAR"),

    body("vehicleNumber")
        .trim()
        .notEmpty().withMessage("Vehicle number is required")
        .isLength({ min: 4, max: 20 })
        .withMessage("Vehicle number must be 4-20 characters"),
];

// ─── UPDATE PROFILE RULES ─────────────────────────────────────
export const updateProfileRules = [
    body("vehicleType")
        .optional()
        .trim()
        .isIn(["BIKE", "SCOOTER", "BICYCLE", "CAR"])
        .withMessage("Vehicle type must be BIKE, SCOOTER, BICYCLE or CAR"),

    body("vehicleNumber")
        .optional()
        .trim()
        .isLength({ min: 4, max: 20 })
        .withMessage("Vehicle number must be 4-20 characters"),
];

// ─── AVAILABILITY RULES ───────────────────────────────────────
export const availabilityRules = [
    body("isAvailable")
        .notEmpty().withMessage("isAvailable is required")
        .isBoolean().withMessage("isAvailable must be true or false"),
];

// ─── LOCATION RULES ───────────────────────────────────────────
export const locationRules = [
    body("latitude")
        .notEmpty().withMessage("Latitude is required")
        .isFloat({ min: -90, max: 90 }).withMessage("Invalid latitude"),

    body("longitude")
        .notEmpty().withMessage("Longitude is required")
        .isFloat({ min: -180, max: 180 }).withMessage("Invalid longitude"),
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