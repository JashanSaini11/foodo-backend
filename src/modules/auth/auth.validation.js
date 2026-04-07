// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Validation rules for every auth endpoint
// Uses express-validator to check request body before hitting the controller
// If validation fails → returns 422 with list of field errors

import { body, validationResult } from "express-validator";
import { errorResponse } from "../../utils/response.js";

// ─── SIGNUP RULES ─────────────────────────────────────────────
export const signupRules = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be 2–50 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must have uppercase, lowercase and a number"),

  body("phone")
    .optional()
    .isMobilePhone("en-IN")
    .withMessage("Please enter a valid Indian phone number"),
];

// ─── LOGIN RULES ──────────────────────────────────────────────
export const loginRules = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address"),

  body("password").notEmpty().withMessage("Password is required"),
];

// ─── VERIFY OTP RULES ─────────────────────────────────────────
export const verifyOTPRules = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address"),

  body("otp")
    .notEmpty()
    .withMessage("OTP is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits")
    .isNumeric()
    .withMessage("OTP must contain numbers only"),
];

// ─── FORGOT PASSWORD RULES ────────────────────────────────────
export const forgotPasswordRules = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address"),
];

// ─── RESET PASSWORD RULES ─────────────────────────────────────
export const resetPasswordRules = [
  body("token").notEmpty().withMessage("Reset token is required"),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must have uppercase, lowercase and a number"),
];

// ─── VALIDATION RESULT CHECKER ────────────────────────────────
// Always add this after the rules array in the route
// It checks if any rule failed and returns all errors at once
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, {
      statusCode: 422,
      message: "Validation failed. Please check your inputs.",
      errors: errors.array().map((e) => ({
        field: e.path, // which field failed
        message: e.msg, // why it failed
      })),
    });
  }
  next(); // all good → move to controller
};
