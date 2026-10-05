import { describe, it, expect, beforeEach, vi } from "vitest";

const { prisma, notifyDeliveryOTP } = vi.hoisted(() => ({
  prisma: {
    deliveryPartner: { findUnique: vi.fn() },
    order: { findFirst: vi.fn(), update: vi.fn() },
  },
  notifyDeliveryOTP: vi.fn(),
}));

vi.mock("../../src/config/db.js", () => ({ prisma }));
vi.mock("../../src/config/redis.js", () => ({
  setCache: vi.fn(),
  getCache: vi.fn(),
  deleteCache: vi.fn(),
}));
vi.mock("../../src/config/socket.js", () => ({ notifyDeliveryOTP }));

import { arriveAtCustomer } from "../../src/modules/delivery/delivery.service.js";

describe("delivery.arriveAtCustomer (OTP generated at the door)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects when the caller has no partner profile", async () => {
    prisma.deliveryPartner.findUnique.mockResolvedValue(null);
    await expect(arriveAtCustomer("u1", "o1")).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("rejects when no active delivery for this order belongs to the partner", async () => {
    prisma.deliveryPartner.findUnique.mockResolvedValue({ id: "p1" });
    prisma.order.findFirst.mockResolvedValue(null);
    await expect(arriveAtCustomer("u1", "o1")).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(prisma.order.update).not.toHaveBeenCalled();
    expect(notifyDeliveryOTP).not.toHaveBeenCalled();
  });

  it("generates a 4-digit OTP, stores it, and pushes it to the customer", async () => {
    prisma.deliveryPartner.findUnique.mockResolvedValue({ id: "p1" });
    prisma.order.findFirst.mockResolvedValue({ id: "o1", userId: "customer-1" });
    prisma.order.update.mockResolvedValue({});

    const result = await arriveAtCustomer("u1", "o1");

    // OTP is persisted with a future expiry.
    expect(prisma.order.update).toHaveBeenCalledTimes(1);
    const updateArg = prisma.order.update.mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: "o1" });
    expect(String(updateArg.data.otp)).toMatch(/^\d{4}$/);
    expect(updateArg.data.otpExpiresAt.getTime()).toBeGreaterThan(Date.now());

    // OTP is pushed to the CUSTOMER, with the same value that was stored.
    expect(notifyDeliveryOTP).toHaveBeenCalledWith(
      "customer-1",
      "o1",
      updateArg.data.otp
    );

    // Partner-facing response never leaks the OTP.
    expect(result.expiresInMinutes).toBe(10);
    expect(JSON.stringify(result)).not.toContain(updateArg.data.otp);
  });
});
