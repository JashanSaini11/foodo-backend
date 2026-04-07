// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Sets up Redis connection and exports helper functions
// Redis is used for: OTP storage, token blacklisting, caching

import Redis from "ioredis";

const redisClient = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  // if connection fails, retry with increasing delay (max 2 seconds)
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redisClient.on("connect", () => console.log("✅ Redis connected successfully"));
redisClient.on("error", (err) => console.error("❌ Redis error:", err.message));

// ─── HELPER: Save data to Redis ───────────────────────────────
// key   → unique identifier e.g. "otp:user@email.com"
// value → any JS value (auto converted to string)
// ttl   → time to live in seconds (optional)
export const setCache = async (key, value, ttlSeconds = null) => {
  const serialized = JSON.stringify(value);
  if (ttlSeconds) {
    await redisClient.setex(key, ttlSeconds, serialized); // auto deletes after ttl
  } else {
    await redisClient.set(key, serialized);
  }
};

// ─── HELPER: Get data from Redis ──────────────────────────────
// Returns null if key doesn't exist or has expired
export const getCache = async (key) => {
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
};

// ─── HELPER: Delete a key from Redis ─────────────────────────
export const deleteCache = async (key) => {
  await redisClient.del(key);
};

// ─── HELPER: Delete multiple keys matching a pattern ─────────
// e.g. deleteByPattern("restaurants:*") clears all restaurant cache
export const deleteCachePattern = async (pattern) => {
  const keys = await redisClient.keys(pattern);
  if (keys.length > 0) await redisClient.del(...keys);
};

// ─── TTL CONSTANTS (seconds) ──────────────────────────────────
// Centralised so we don't hardcode numbers throughout the codebase
export const TTL = {
  OTP: 5 * 60, // 5 minutes  → email verification OTP
  REFRESH_TOKEN: 7 * 24 * 60 * 60, // 7 days  → refresh token storage
  RESTAURANT_LIST: 6 * 60 * 60, // 6 hours → nearby restaurants cache
  CART: 30 * 60, // 30 minutes  → user cart
  RESET_TOKEN: 15 * 60, // 15 minutes  → password reset link
};
  
export default redisClient;
