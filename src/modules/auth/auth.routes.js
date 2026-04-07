// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Defines all auth API endpoints

import express from "express";
import passport from "passport";
import rateLimit from "express-rate-limit";
import * as authController from "./auth.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";
import {
  signupRules,
  loginRules,
  verifyOTPRules,
  forgotPasswordRules,
  resetPasswordRules,
  validate,
} from "./auth.validation.js";

const router = express.Router();

// ─── RATE LIMITERS ────────────────────────────────────────────
// Prevents brute force attacks on auth endpoints
// General auth limiter: max 10 requests per 15 minutes

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many attempts. Please try again in 15 minutes.",
  },
});

// OTP limiter: max 3 requests per 5 minutes (prevent OTP spam)
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: "Too many OTP requests. Please wait 5 minutes.",
  },
});

// ─── ROUTES ───────────────────────────────────────────────────

// @POST /api/auth/signup
// Body: { name, email, password, phone? }
// Creates user → sends OTP email
router.post(
  "/signup",
  authLimiter,
  signupRules,
  validate,
  authController.signup,
);

// @POST /api/auth/verify-email
// Body: { email, otp }
// Verifies OTP → marks email as verified → returns tokens
router.post(
  "/verify-email",
  otpLimiter,
  verifyOTPRules,
  validate,
  authController.verifyEmail,
);

// @POST /api/auth/resend-otp
// Body: { email }
// Resends a new OTP to the email
router.post("/resend-otp", otpLimiter, authController.resendOTP);

// @POST /api/auth/login
// Body: { email, password }
// Returns access token + sets refresh token cookie
router.post("/login", authLimiter, loginRules, validate, authController.login);

// @POST /api/auth/refresh-token
// Cookie: refreshToken (httpOnly)
// Returns new access token
router.post("/refresh-token", authController.refreshToken);

// @POST /api/auth/logout  🔒 Protected
// Blacklists access token + removes refresh token
router.post("/logout", protect, authController.logout);

// @GET /api/auth/me  🔒 Protected
// Returns currently logged in user info
router.get("/me", protect, authController.getMe);

// @POST /api/auth/forgot-password
// Body: { email }
// Sends password reset link to email
router.post(
  "/forgot-password",
  authLimiter,
  forgotPasswordRules,
  validate,
  authController.forgotPassword,
);

// @POST /api/auth/reset-password
// Body: { token, newPassword }
// Resets password using the token from email link
router.post(
  "/reset-password",
  resetPasswordRules,
  validate,
  authController.resetPassword,
);

// ─── GOOGLE OAUTH ROUTES ──────────────────────────────────────

// @GET /api/auth/google
// Redirects user to Google's login page
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  }),
);

// @GET /api/auth/google/callback
// Google redirects back here after user approves
// Passport handles the user creation → calls googleCallback controller
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/api/auth/google/failure",
  }),
  authController.googleCallback,
);

// @GET /api/auth/google/failure
router.get("/google/failure", (req, res) => {
  res.redirect(
    `${process.env.CLIENT_URL}/auth/error?message=Google+login+failed`,
  );
});

export default router;
