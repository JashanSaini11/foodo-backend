// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// All auth business logic lives here
// Controller calls these functions → service does the actual work
// Keeps controllers thin and logic testable

import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../../config/db.js";
import { setCache, getCache, deleteCache, TTL } from "../../config/redis.js";
import {
  generateTokenPair,
  verifyRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
} from "../../utils/jwt.js";
import {
  sendOTPEmail,   
  sendWelcomeEmail,
  sendPasswordResetEmail,
} from "../../utils/email.js";

// ─── HELPER: Generate 6-digit OTP ─────────────────────────────
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ─── SIGNUP ───────────────────────────────────────────────────
// Creates a new user → sends OTP for email verification
export const signup = async ({ name, email, password, phone }) => {
  // Check if email already registered
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw { statusCode: 409, message: "This email is already registered." };
  }

  // Hash password before saving (never store plain text)
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user — isVerified = false until OTP confirmed
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      phone: phone || null,
      provider: "LOCAL",
      isVerified: false,
    },
  });

  // Generate OTP → store in Redis for 5 minutes → email it
  const otp = generateOTP();
  await setCache(`otp:${email}`, otp, TTL.OTP);
  // await sendOTPEmail(email, otp);  temp comment for testing without email service
  console.log(`OTP for ${email}: ${otp}`); // Log OTP for testing

  return {
    message: "Account created! Please check your email for the OTP.",
    email: user.email,
  };
};

// ─── VERIFY EMAIL ─────────────────────────────────────────────
// Checks OTP from Redis → marks user as verified → returns tokens
export const verifyEmail = async ({ email, otp }) => {   
  const storedOTP = await getCache(`otp:${email}`);

  if (!storedOTP) {
    throw {
      statusCode: 400,
      message: "OTP has expired. Please request a new one.",
    };
  }
  if (storedOTP !== otp) {
    throw { statusCode: 400, message: "Incorrect OTP. Please try again." };
  }

  // Mark as verified in PostgreSQL
  const user = await prisma.user.update({
    where: { email },
    data: { isVerified: true },
  });

  // Clean up OTP from Redis
  await deleteCache(`otp:${email}`);

  // Send welcome email (non-blocking)
  sendWelcomeEmail(email, user.name).catch(() => {});

  // Generate access + refresh tokens
  const tokens = await generateTokenPair(user);

  return {
    message: "Email verified! Welcome to Foodo.",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    },
    ...tokens,
  };
};

// ─── RESEND OTP ───────────────────────────────────────────────
export const resendOTP = async ({ email }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw { statusCode: 404, message: "User not found." };
  if (user.isVerified)
    throw { statusCode: 400, message: "Email is already verified." };

  const otp = generateOTP();
  await setCache(`otp:${email}`, otp, TTL.OTP);
  await sendOTPEmail(email, otp);

  return { message: "New OTP sent to your email." };
};

// ─── LOGIN ────────────────────────────────────────────────────
// Validates credentials → returns tokens
export const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });

  // Use same error for wrong email or wrong password (security best practice)
  if (!user) {
    throw { statusCode: 401, message: "Invalid email or password." };
  }

  // User signed up with Google — no password set
  if (user.provider === "GOOGLE" && !user.password) {
    throw {
      statusCode: 400,
      message: "This account uses Google Sign-In. Please continue with Google.",
    };
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw { statusCode: 401, message: "Invalid email or password." };
  }

  // Not verified yet → resend OTP
  if (!user.isVerified) {
    const otp = generateOTP();
    await setCache(`otp:${email}`, otp, TTL.OTP);
    await sendOTPEmail(email, otp);
    throw {
      statusCode: 403,
      message: "Email not verified. A new OTP has been sent to your email.",
    };
  }

  if (!user.isActive) {
    throw {
      statusCode: 403,
      message: "Your account is deactivated. Please contact support.",
    };
  }

  const tokens = await generateTokenPair(user);

  return {
    message: "Welcome back!",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
    },
    ...tokens,
  };
};

// ─── REFRESH ACCESS TOKEN ─────────────────────────────────────
// Uses refresh token (from cookie) to issue a new access token
export const refreshAccessToken = async (refreshToken) => {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw { statusCode: 401, message: "Invalid or expired refresh token." };
  }

  // Check it matches what we stored in Redis (wasn't revoked)
  const isValid = await validateRefreshToken(payload.userId, refreshToken);
  if (!isValid) {
    throw { statusCode: 401, message: "Session expired. Please login again." };
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.isActive) {
    throw {
      statusCode: 401,
      message: "User not found or account deactivated.",
    };
  }

  const tokens = await generateTokenPair(user);
  return { message: "Token refreshed.", ...tokens };
};

// ─── LOGOUT ───────────────────────────────────────────────────
export const logout = async (userId) => {
  await revokeRefreshToken(userId); // remove from Redis
  return { message: "Logged out successfully." };
};

// ─── GOOGLE AUTH ──────────────────────────────────────────────
// Called after Google OAuth callback — user already created by passport
export const googleAuthCallback = async (user) => {
  const tokens = await generateTokenPair(user);
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    },
    ...tokens,
  };
};

// ─── FORGOT PASSWORD ──────────────────────────────────────────
export const forgotPassword = async ({ email }) => {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return same message (don't reveal if email exists — security)
  if (!user || user.provider === "GOOGLE") {
    return {
      message: "If this email is registered, a reset link has been sent.",
    };
  }

  const resetToken = uuidv4();
  await setCache(`reset_token:${resetToken}`, user.id, TTL.RESET_TOKEN);
  await sendPasswordResetEmail(email, resetToken);

  return {
    message: "If this email is registered, a reset link has been sent.",
  };
};

// ─── RESET PASSWORD ───────────────────────────────────────────
export const resetPassword = async ({ token, newPassword }) => {
  const userId = await getCache(`reset_token:${token}`);
  if (!userId) {
    throw { statusCode: 400, message: "Reset link is invalid or has expired." };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  // Cleanup: remove reset token + force re-login on all devices
  await deleteCache(`reset_token:${token}`);
  await revokeRefreshToken(userId);

  return {
    message:
      "Password reset successfully. Please login with your new password.",
  };
};
