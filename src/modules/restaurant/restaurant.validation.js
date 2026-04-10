// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Validation rules for restaurant endpoints
// Follows the same validate() pattern used in auth and user modules

import { body, param, query, validationResult } from "express-validator";
import { errorResponse } from "../../utils/response.js";

// ─── CREATE / UPDATE RESTAURANT RULES ────────────────────────
export const restaurantRules = [
  body("name")
    .trim()
    .notEmpty().withMessage("Restaurant name is required")
    .isLength({ min: 2, max: 100 }).withMessage("Name must be 2–100 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage("Description max 500 characters"),

  body("cuisineTypes")
    .isArray({ min: 1 }).withMessage("At least one cuisine type is required")
    .custom((arr) => arr.every((c) => typeof c === "string" && c.trim().length > 0))
    .withMessage("Each cuisine type must be a non-empty string"),

  body("address.addressLine1")
    .trim()
    .notEmpty().withMessage("Address line 1 is required"),

  body("address.city")
    .trim()
    .notEmpty().withMessage("City is required"),

  body("address.state")
    .trim()
    .notEmpty().withMessage("State is required"),

  body("address.pincode")
    .trim()
    .notEmpty().withMessage("Pincode is required")
    .matches(/^[1-9][0-9]{5}$/).withMessage("Enter a valid 6-digit pincode"),

  body("location.coordinates")
    .isArray({ min: 2, max: 2 }).withMessage("Coordinates must be [longitude, latitude]")
    .custom(([lng, lat]) => lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90)
    .withMessage("Invalid coordinates"),

  body("deliveryRadius")
    .notEmpty().withMessage("Delivery radius is required")
    .isFloat({ min: 1, max: 50 }).withMessage("Delivery radius must be 1–50 km"),

  body("minOrderAmount")
    .optional()
    .isFloat({ min: 0 }).withMessage("Min order amount cannot be negative"),

  body("avgDeliveryTime")
    .optional()
    .isInt({ min: 5, max: 120 }).withMessage("Avg delivery time must be 5–120 minutes"),

  body("deliveryFee")
    .optional()
    .isFloat({ min: 0 }).withMessage("Delivery fee cannot be negative"),
];

// ─── TOGGLE STATUS RULES ─────────────────────────────────────
export const toggleStatusRules = [
  body("isOpen")
    .notEmpty().withMessage("isOpen field is required")
    .isBoolean().withMessage("isOpen must be true or false"),
];

// ─── NEARBY RESTAURANTS QUERY RULES ──────────────────────────
export const nearbyQueryRules = [
  query("latitude")
    .notEmpty().withMessage("Latitude is required")
    .isFloat({ min: -90, max: 90 }).withMessage("Invalid latitude"),

  query("longitude")
    .notEmpty().withMessage("Longitude is required")
    .isFloat({ min: -180, max: 180 }).withMessage("Invalid longitude"),

  query("radius")
    .optional()
    .isFloat({ min: 1, max: 50 }).withMessage("Radius must be 1–50 km"),
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