// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Validation rules for menu category and food item endpoints

import { body, validationResult } from "express-validator";
import { errorResponse } from "../../../utils/response.js";

// ─── MENU CATEGORY RULES ──────────────────────────────────────
export const categoryRules = [
  body("name")
    .trim()
    .notEmpty().withMessage("Category name is required")
    .isLength({ max: 50 }).withMessage("Name cannot exceed 50 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage("Description max 200 characters"),

  body("sortOrder")
    .optional()
    .isInt({ min: 0 }).withMessage("Sort order must be a non-negative integer"),
];

// ─── FOOD ITEM RULES ──────────────────────────────────────────
export const foodItemRules = [
  body("name")
    .trim()
    .notEmpty().withMessage("Item name is required")
    .isLength({ max: 100 }).withMessage("Name cannot exceed 100 characters"),

  body("categoryId")
    .notEmpty().withMessage("Category ID is required")
    .isMongoId().withMessage("Invalid category ID"),

  body("price")
    .notEmpty().withMessage("Price is required")
    .isFloat({ min: 0 }).withMessage("Price must be a positive number"),

  body("isVeg")
    .notEmpty().withMessage("Please specify veg or non-veg")
    .isBoolean().withMessage("isVeg must be true or false"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage("Description max 300 characters"),

  body("preparationTime")
    .optional()
    .isInt({ min: 1, max: 120 }).withMessage("Prep time must be 1–120 minutes"),

  body("customizations")
    .optional()
    .isArray().withMessage("Customizations must be an array"),

  body("customizations.*.name")
    .optional()
    .trim()
    .notEmpty().withMessage("Customization name is required"),

  body("customizations.*.price")
    .optional()
    .isFloat({ min: 0 }).withMessage("Customization price cannot be negative"),
];

// ─── AVAILABILITY TOGGLE RULES ────────────────────────────────
export const availabilityRules = [
  body("isAvailable")
    .notEmpty().withMessage("isAvailable field is required")
    .isBoolean().withMessage("isAvailable must be true or false"),
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