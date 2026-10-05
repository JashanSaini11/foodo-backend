import { describe, it, expect, beforeEach, vi } from "vitest";
import crypto from "crypto";

// ─── Mocks ────────────────────────────────────────────────────
// vi.mock factories are hoisted to the top of the file, so any
// variables they reference must be created with vi.hoisted.
const { prisma, refundMock, ordersCreateMock } = vi.hoisted(() => ({
  prisma: { order: { findFirst: vi.fn(), update: vi.fn() } },
  refundMock: vi.fn(async () => ({ id: "rfnd_1" })),
  ordersCreateMock: vi.fn(async () => ({
    id: "order_rzp_1",
    amount: 50000,
    currency: "INR",
  })),
}));

vi.mock("../../src/config/db.js", () => ({ prisma }));

// Mock the Razorpay SDK so no network calls happen.
vi.mock("razorpay", () => ({
  default: class {
    constructor() {
      this.orders = { create: ordersCreateMock };
      this.payments = { refund: refundMock };
    }
  },
}));

import {
  verifyPayment,
  refundOrderPayment,
} from "../../src/modules/order/payment/payment.service.js";

// Build the signature exactly as Razorpay would.
const sign = (rzpOrderId, paymentId) =>
  crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${rzpOrderId}|${paymentId}`)
    .digest("hex");

describe("payment.verifyPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validBody = () => ({
    razorpayOrderId: "order_rzp_1",
    razorpayPaymentId: "pay_1",
    razorpaySignature: sign("order_rzp_1", "pay_1"),
    orderId: "order-db-1",
  });

  it("rejects an invalid signature before touching the DB", async () => {
    await expect(
      verifyPayment("user-1", { ...validBody(), razorpaySignature: "deadbeef" })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.order.findFirst).not.toHaveBeenCalled();
  });

  it("rejects when the order does not belong to the user (404)", async () => {
    prisma.order.findFirst.mockResolvedValue(null);
    await expect(verifyPayment("user-1", validBody())).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it("rejects a cash-on-delivery order", async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: "order-db-1",
      paymentMethod: "CASH_ON_DELIVERY",
      paymentStatus: "PENDING",
    });
    await expect(verifyPayment("user-1", validBody())).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("rejects an already-paid order", async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: "order-db-1",
      paymentMethod: "RAZORPAY",
      paymentStatus: "COMPLETED",
    });
    await expect(verifyPayment("user-1", validBody())).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("marks a valid, owned, pending order as COMPLETED", async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: "order-db-1",
      paymentMethod: "RAZORPAY",
      paymentStatus: "PENDING",
    });
    prisma.order.update.mockResolvedValue({
      id: "order-db-1",
      paymentStatus: "COMPLETED",
      paymentId: "pay_1",
      status: "PENDING",
    });

    const result = await verifyPayment("user-1", validBody());
    expect(result.order.paymentStatus).toBe("COMPLETED");
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order-db-1" },
        data: expect.objectContaining({ paymentStatus: "COMPLETED" }),
      })
    );
  });
});

describe("payment.refundOrderPayment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("no-ops for COD orders", async () => {
    const res = await refundOrderPayment({
      id: "o1",
      paymentMethod: "CASH_ON_DELIVERY",
      paymentStatus: "COMPLETED",
    });
    expect(res.refunded).toBe(false);
    expect(refundMock).not.toHaveBeenCalled();
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it("no-ops for unpaid online orders", async () => {
    const res = await refundOrderPayment({
      id: "o1",
      paymentMethod: "RAZORPAY",
      paymentStatus: "PENDING",
    });
    expect(res.refunded).toBe(false);
  });

  it("refunds a paid online order and flips status to REFUNDED", async () => {
    const res = await refundOrderPayment({
      id: "o1",
      paymentMethod: "RAZORPAY",
      paymentStatus: "COMPLETED",
      paymentId: "pay_1",
      totalAmount: 500,
    });
    expect(res.refunded).toBe(true);
    expect(refundMock).toHaveBeenCalledWith(
      "pay_1",
      expect.objectContaining({ amount: 50000 })
    );
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { paymentStatus: "REFUNDED" } })
    );
  });

  it("still marks REFUNDED even if the gateway refund throws", async () => {
    refundMock.mockRejectedValueOnce(new Error("gateway down"));
    const res = await refundOrderPayment({
      id: "o1",
      paymentMethod: "RAZORPAY",
      paymentStatus: "COMPLETED",
      paymentId: "pay_1",
      totalAmount: 100,
    });
    expect(res.refunded).toBe(true);
    expect(prisma.order.update).toHaveBeenCalled();
  });
});
