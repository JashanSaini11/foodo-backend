// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Two middlewares to protect routes:
// 1. protect()   → reads access token from httpOnly cookie → verifies it
// 2. authorize() → checks user has the required role

import passport from "passport";
import { isTokenBlacklisted } from "../utils/jwt.js";
import { errorResponse } from "../utils/response.js";

// ─── PROTECT MIDDLEWARE ───────────────────────────────────────
// Add this to any route that requires the user to be logged in
//
// Flow:
// 1. Read accessToken from httpOnly cookie
// 2. Check if it was blacklisted (user logged out)
// 3. Verify JWT signature via passport
// 4. Attach user to req.user → available in controller
export const protect = async (req, res, next) => {
  // Read token from httpOnly cookie (not from Authorization header)
  const token = req.cookies?.accessToken;

  if (!token) {
    return errorResponse(res, {
      statusCode: 401,
      message: "You are not logged in. Please login to continue.",
    });
  }

  // Check if this token was blacklisted (happens when user logs out)
  const blacklisted = await isTokenBlacklisted(token);
  if (blacklisted) {
    return errorResponse(res, {
      statusCode: 401,
      message: "Session expired. Please login again.",
    });
  }

  // Temporarily attach token to Authorization header so passport-jwt can read it
  // passport-jwt is configured to read from Authorization header
  req.headers.authorization = `Bearer ${token}`;

  // Verify the token using passport JWT strategy
  passport.authenticate("jwt", { session: false }, (err, user) => {
    if (err || !user) {
      return errorResponse(res, {
        statusCode: 401,
        message: "Invalid or expired session. Please login again.",
      });
    }
    req.user = user; // now available as req.user in all controllers
    next();
  })(req, res, next);
};

// ─── AUTHORIZE MIDDLEWARE ─────────────────────────────────────
// Use AFTER protect() to restrict by user role
// Usage: router.delete("/users/:id", protect, authorize("ADMIN"), controller)
// Usage: router.post("/menu", protect, authorize("ADMIN", "RESTAURANT_OWNER"), controller)
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return errorResponse(res, {
        statusCode: 403,
        message: `Access denied. Only ${roles.join(" or ")} can perform this action.`,
      });
    }
    next();
  };
};
