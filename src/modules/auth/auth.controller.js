// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Handles HTTP layer only — reads request, calls service, sends response
// Both access token and refresh token are stored in httpOnly cookies
// Frontend never touches tokens directly → more secure

import * as authService from "./auth.service.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { blacklistAccessToken } from "../../utils/jwt.js";

// ─── COOKIE CONFIGS ───────────────────────────────────────────

// Access token cookie — short lived (15 minutes)
const accessTokenCookieOptions = {
  httpOnly: true, 
  secure: process.env.NODE_ENV === "production", 
  sameSite: "strict",
  maxAge: 15 * 60 * 1000, // 15 minutes in ms
};

// Refresh token cookie — long lived (7 days)
const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

// ─── HELPER: Set both token cookies at once ───────────────────
const setTokenCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, accessTokenCookieOptions);
  res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);
};

// ─── HELPER: Clear both token cookies on logout ───────────────
const clearTokenCookies = (res) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
};

// ─── SIGNUP ───────────────────────────────────────────────────
// POST /api/auth/signup
export const signup = async (req, res) => {
  try {
    const result = await authService.signup(req.body);
    return successResponse(res, {
      statusCode: 201,
      message: result.message,
      data: { email: result.email },
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      message: err.message,
    });
  }
};

// ─── VERIFY EMAIL ─────────────────────────────────────────────
// POST /api/auth/verify-email
export const verifyEmail = async (req, res) => {
  try {
    const result = await authService.verifyEmail(req.body);
    // Both tokens go into httpOnly cookies
    setTokenCookies(res, result.accessToken, result.refreshToken);
    return successResponse(res, {
      statusCode: 200,
      message: result.message,
      data: { user: result.user },
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      message: err.message,
    });
  }
};

// ─── RESEND OTP ───────────────────────────────────────────────
// POST /api/auth/resend-otp
export const resendOTP = async (req, res) => {
  try {
    const result = await authService.resendOTP(req.body);
    return successResponse(res, { statusCode: 200, message: result.message });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      message: err.message,
    });
  }
};

// ─── LOGIN ────────────────────────────────────────────────────
// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    // Both tokens go into httpOnly cookies 
    setTokenCookies(res, result.accessToken, result.refreshToken);
    return successResponse(res, {
      statusCode: 200,
      message: result.message,
      data: { user: result.user },
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      message: err.message,
    });
  }
};

// ─── REFRESH TOKEN ────────────────────────────────────────────
// POST /api/auth/refresh-token
// Reads refresh token from cookie → issues new access token cookie
export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return errorResponse(res, {
        statusCode: 401,
        message: "Session expired. Please login again.",
      });
    }
    const result = await authService.refreshAccessToken(token);
    // Only update the access token cookie (refresh token stays same)
    res.cookie("accessToken", result.accessToken, accessTokenCookieOptions);
    return successResponse(res, {
      statusCode: 200,
      message: result.message,
      data: null,
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      message: err.message,
    });
  }
};

// ─── LOGOUT ───────────────────────────────────────────────────
// POST /api/auth/logout  (protected route)
export const logout = async (req, res) => {
  try {
    // Blacklist the access token so it can't be reused even if someone has it
    const accessToken = req.cookies?.accessToken;
    if (accessToken) {
      await blacklistAccessToken(accessToken);
    }
    await authService.logout(req.user.id);
    // Wipe both cookies from the browser
    clearTokenCookies(res);
    return successResponse(res, {
      statusCode: 200,
      message: "Logged out successfully.",
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      message: err.message,
    });
  }
};

// ─── GOOGLE CALLBACK ──────────────────────────────────────────
// GET /api/auth/google/callback
export const googleCallback = async (req, res) => {
  try {
    const result = await authService.googleAuthCallback(req.user);
    // Set both tokens as secure cookies
    setTokenCookies(res, result.accessToken, result.refreshToken);
    return res.redirect(`${process.env.CLIENT_URL}/auth/callback`);
  } catch (err) {
    return res.redirect(`${process.env.CLIENT_URL}/auth/error`);
  }
};

// ─── FORGOT PASSWORD ──────────────────────────────────────────
// POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const result = await authService.forgotPassword(req.body);
    return successResponse(res, { statusCode: 200, message: result.message });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      message: err.message,
    });
  }
};

// ─── RESET PASSWORD ───────────────────────────────────────────
// POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
  try {
    const result = await authService.resetPassword(req.body);
    return successResponse(res, { statusCode: 200, message: result.message });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      message: err.message,
    });
  }
};

// ─── GET CURRENT USER ─────────────────────────────────────────
// GET /api/auth/me  (protected route)
export const getMe = (req, res) => {
  return successResponse(res, {
    statusCode: 200,
    message: "User fetched successfully.",
    data: { user: req.user },
  });
};
