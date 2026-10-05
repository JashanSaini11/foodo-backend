import { describe, it, expect, beforeEach, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    order: { findFirst: vi.fn(), update: vi.fn() },
    deliveryAssignment: { updateMany: vi.fn() },
  },
}));
vi.mock("../../src/config/db.js", () => ({ prisma }));

// order.service transitively imports redis (via cart.service) and
// razorpay (via payment.service); stub the ones that would open
// network connections at import time.
vi.mock("../../src/config/redis.js", () => ({
  setCache: vi.fn(),
  getCache: vi.fn(),
  deleteCache: vi.fn(),
  TTL: { CART: 1800 },
}));

import {
  updateOrderStatus,
  verifyDeliveryOTP,
} from "../../src/modules/order/order.service.js";

describe("order.updateOrderStatus (state machine)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows a valid PENDING → ACCEPTED transition", async () => {
    prisma.order.findFirst.mockResolvedValue({ id: "o1", status: "PENDING" });
    prisma.order.update.mockResolvedValue({ id: "o1", status: "ACCEPTED" });
    const res = await updateOrderStatus("r1", "o1", "ACCEPTED");
    expect(res.order.status).toBe("ACCEPTED");
  });

  it("rejects an illegal PENDING → DELIVERED jump", async () => {
    prisma.order.findFirst.mockResolvedValue({ id: "o1", status: "PENDING" });
    await expect(updateOrderStatus("r1", "o1", "DELIVERED")).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it("rejects when the order is not found for that restaurant", async () => {
    prisma.order.findFirst.mockResolvedValue(null);
    await expect(updateOrderStatus("r1", "o1", "ACCEPTED")).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe("order.verifyDeliveryOTP", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fails when no OUT_FOR_DELIVERY order matches", async () => {
    prisma.order.findFirst.mockResolvedValue(null);
    await expect(verifyDeliveryOTP("o1", "1234")).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("fails on an expired OTP", async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: "o1",
      otp: "1234",
      otpExpiresAt: new Date(Date.now() - 1000), // already expired
    });
    await expect(verifyDeliveryOTP("o1", "1234")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("fails on a wrong OTP", async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: "o1",
      otp: "1234",
      otpExpiresAt: new Date(Date.now() + 60_000),
    });
    await expect(verifyDeliveryOTP("o1", "9999")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("marks the order DELIVERED (and COD paid) on a correct OTP", async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: "o1",
      otp: "1234",
      otpExpiresAt: new Date(Date.now() + 60_000),
      paymentMethod: "CASH_ON_DELIVERY",
      paymentStatus: "PENDING",
    });
    prisma.order.update.mockResolvedValue({ id: "o1", status: "DELIVERED" });
    prisma.deliveryAssignment.updateMany.mockResolvedValue({ count: 1 });

    const res = await verifyDeliveryOTP("o1", "1234");
    expect(res.order.status).toBe("DELIVERED");
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "DELIVERED",
          paymentStatus: "COMPLETED",
          otp: null,
        }),
      })
    );
  });
});
