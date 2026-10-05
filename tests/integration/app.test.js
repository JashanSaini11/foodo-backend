import { describe, it, expect, vi } from "vitest";
import request from "supertest";

// Stub the things that would open real connections when the full
// app (and its whole route tree) is imported. We only exercise
// middleware-level behaviour here (health, 404, validation), so the
// DB/Redis are never actually queried.
vi.mock("../../src/config/redis.js", () => ({
  __esModule: true,
  default: { quit: vi.fn() },
  setCache: vi.fn(),
  getCache: vi.fn(),
  deleteCache: vi.fn(),
  deleteCachePattern: vi.fn(),
  TTL: { OTP: 300, REFRESH_TOKEN: 1, RESTAURANT_LIST: 1, CART: 1, RESET_TOKEN: 1 },
}));
vi.mock("../../src/config/db.js", () => ({
  prisma: {},
  connectPostgres: vi.fn(),
  connectMongoDB: vi.fn(),
}));

const { default: app } = await import("../../src/app.js");

describe("app middleware & wiring", () => {
  it("GET /health returns 200 and a success envelope", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("unknown routes return a 404 envelope", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("rejects signup with an invalid email (422 validation)", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ name: "Jo", email: "not-an-email", password: "Abc12345" });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it("rejects signup with a weak password (422 validation)", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ name: "Jo", email: "jo@example.com", password: "weak" });
    expect(res.status).toBe(422);
  });

  it("sets standard rate-limit headers on /api responses", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.headers["ratelimit-limit"]).toBeDefined();
  });
});
