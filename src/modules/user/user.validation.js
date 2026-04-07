// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Validates request body for user profile update
// Reuses the same validate() checker pattern from auth

import { body, validationResult } from "express-validator";
import { errorResponse } from "../../utils/response.js";

// ─── UPDATE PROFILE RULES ─────────────────────────────────────
// Both fields are optional — user can update just name or just phone
export const updateProfileRules = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be 2–50 characters"),

  body("phone")
    .optional()
    .isMobilePhone("en-IN")
    .withMessage("Please enter a valid Indian phone number"),
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
