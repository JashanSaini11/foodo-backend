import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mock Redis with an in-memory store ───────────────────────
// jwt.js stores/validates refresh tokens and the blacklist via the
// redis helpers. We replace them with a simple Map so the unit test
// never touches a real Redis server.
const store = new Map();
vi.mock("../../src/config/redis.js", () => ({
  setCache: vi.fn(async (key, value) => {
    store.set(key, value);
  }),
  getCache: vi.fn(async (key) => (store.has(key) ? store.get(key) : null)),
  deleteCache: vi.fn(async (key) => {
    store.delete(key);
  }),
  TTL: { REFRESH_TOKEN: 604800 },
}));

import {
  generateAccessToken,
  verifyAccessToken,
  generateTokenPair,
  validateRefreshToken,
  revokeRefreshToken,
  blacklistAccessToken,
  isTokenBlacklisted,
} from "../../src/utils/jwt.js";

const user = { id: "user-1", email: "a@b.com", role: "USER" };

describe("jwt utils", () => {
  beforeEach(() => store.clear());

  it("signs an access token that verifies back to the same payload", () => {
    const token = generateAccessToken({ userId: user.id, role: user.role });
    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe(user.id);
    expect(decoded.role).toBe("USER");
  });

  it("rejects a tampered access token", () => {
    const token = generateAccessToken({ userId: user.id });
    expect(() => verifyAccessToken(token + "x")).toThrow();
  });

  it("generateTokenPair stores the refresh token and it validates", async () => {
    const { accessToken, refreshToken } = await generateTokenPair(user);
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();
    await expect(validateRefreshToken(user.id, refreshToken)).resolves.toBe(true);
  });

  it("validateRefreshToken fails after the token is revoked", async () => {
    const { refreshToken } = await generateTokenPair(user);
    await revokeRefreshToken(user.id);
    await expect(validateRefreshToken(user.id, refreshToken)).resolves.toBe(false);
  });

  it("blacklisted access tokens are detected", async () => {
    const token = generateAccessToken({ userId: user.id });
    await expect(isTokenBlacklisted(token)).resolves.toBe(false);
    await blacklistAccessToken(token, 900);
    await expect(isTokenBlacklisted(token)).resolves.toBe(true);
  });
});
