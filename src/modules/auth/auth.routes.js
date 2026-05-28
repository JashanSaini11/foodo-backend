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
/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupRequest'
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       409:
 *         description: Email already registered
 */
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
/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify email with OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyOTPRequest'
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired OTP
 */
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
/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend OTP email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@gmail.com
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       400:
 *         description: Email not registered or already verified
 */
router.post("/resend-otp", otpLimiter, authController.resendOTP);

// @POST /api/auth/login
// Body: { email, password }
// Returns access token + sets refresh token cookie
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", authLimiter, loginRules, validate, authController.login);

// @POST /api/auth/refresh-token
// Cookie: refreshToken (httpOnly)
// Returns new access token
/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Refresh token invalid or expired
 */
router.post("/refresh-token", authController.refreshToken);

// @POST /api/auth/logout  🔒 Protected
// Blacklists access token + removes refresh token
/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout current user
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Not authenticated
 */
router.post("/logout", protect, authController.logout);

// @GET /api/auth/me  🔒 Protected
// Returns currently logged in user info
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current logged in user
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User fetched successfully
 *       401:
 *         description: Not authenticated
 */
router.get("/me", protect, authController.getMe);

// @POST /api/auth/forgot-password
// Body: { email }
// Sends password reset link to email
/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Send password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Reset email sent
 */
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
/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post(
  "/reset-password",
  resetPasswordRules,
  validate,
  authController.resetPassword,
);

// ─── GOOGLE OAUTH ROUTES ──────────────────────────────────────

// @GET /api/auth/google
// Redirects user to Google's login page
/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Login with Google
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to Google authentication page
 */
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
/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirects back to client on success/failure
 */
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/api/auth/google/failure",
  }),
  authController.googleCallback,
);

// @GET /api/auth/google/failure
/**
 * @swagger
 * /api/auth/google/failure:
 *   get:
 *     summary: Google OAuth failure
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirects to client error page
 */
router.get("/google/failure", (req, res) => {
  res.redirect(
    `${process.env.CLIENT_URL}/auth/error?message=Google+login+failed`,
  );
});

export default router;
