// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// All JWT token operations in one place:
// Generate, verify, blacklist, and revoke tokens

import jwt from "jsonwebtoken";
import { setCache, getCache, deleteCache, TTL } from "../config/redis.js";

// ─── GENERATE ACCESS TOKEN ────────────────────────────────────
// Short-lived token (15min) sent with every API request
// Contains: userId, email, role
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  });
};

// ─── GENERATE REFRESH TOKEN ───────────────────────────────────
// Long-lived token (7 days) stored in httpOnly cookie
// Used to get a new access token without re-login
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });
};

// ─── GENERATE BOTH TOKENS AT ONCE ────────────────────────────
// Called after login/signup/google auth
// Also stores refresh token in Redis for validation later
export const generateTokenPair = async (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Store refresh token in Redis → used to validate it on refresh requests
  await setCache(`refresh_token:${user.id}`, refreshToken, TTL.REFRESH_TOKEN);

  return { accessToken, refreshToken };
};

// ─── VERIFY ACCESS TOKEN ──────────────────────────────────────
export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

// ─── VERIFY REFRESH TOKEN ─────────────────────────────────────
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

// ─── VALIDATE REFRESH TOKEN AGAINST REDIS ────────────────────
// Checks that the token matches what we stored (prevents token reuse after logout)
export const validateRefreshToken = async (userId, token) => {
  const storedToken = await getCache(`refresh_token:${userId}`);
  return storedToken === token;
};

// ─── BLACKLIST ACCESS TOKEN ───────────────────────────────────
// On logout → store token in Redis until it naturally expires
// The protect middleware checks this list and rejects blacklisted tokens
export const blacklistAccessToken = async (token, expiresIn = 900) => {
  await setCache(`blacklist:${token}`, true, expiresIn); // 900s = 15min default
};

// ─── REVOKE REFRESH TOKEN ─────────────────────────────────────
// On logout → delete refresh token from Redis
export const revokeRefreshToken = async (userId) => {
  await deleteCache(`refresh_token:${userId}`);
};

// ─── CHECK IF TOKEN IS BLACKLISTED ───────────────────────────
export const isTokenBlacklisted = async (token) => {
  const result = await getCache(`blacklist:${token}`);
  return !!result;
};
