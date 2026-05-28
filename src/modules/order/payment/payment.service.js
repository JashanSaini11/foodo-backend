// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Handles Razorpay payment integration
// Flow:
// 1. Frontend calls createPaymentOrder → gets razorpay order id
// 2. User pays on Razorpay checkout
// 3. Frontend calls verifyPayment → backend verifies signature
// 4. On success → order status updated to paid

import Razorpay from "razorpay";
import crypto from "crypto";
import { prisma } from "../../../config/db.js";

// ─── RAZORPAY INSTANCE ────────────────────────────────────────
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── CREATE PAYMENT ORDER ─────────────────────────────────────
// Creates a Razorpay order → returns order id to frontend
// Frontend uses this id to open Razorpay checkout
export const createPaymentOrder = async (userId, orderId) => {
    // Get order from PostgreSQL
    const order = await prisma.order.findFirst({
        where: { id: orderId, userId },
    });

    if (!order) {
        throw { statusCode: 404, message: "Order not found." };
    }

    if (order.paymentStatus === "COMPLETED") {
        throw { statusCode: 400, message: "Order is already paid." };
    }

    if (order.paymentMethod === "CASH_ON_DELIVERY") {
        throw { statusCode: 400, message: "This order is cash on delivery. No online payment needed." };
    }

    // Create Razorpay order
    // amount is in paise (₹1 = 100 paise)
    const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(order.totalAmount * 100), // convert to paise
        currency: "INR",
        receipt: orderId,
        notes: {
            orderId,
            userId,
        },
    });

    return {
        message: "Payment order created.",
        payment: {
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            orderId,
            keyId: process.env.RAZORPAY_KEY_ID, // frontend needs this
        },
    };
};

// ─── VERIFY PAYMENT ───────────────────────────────────────────
// After user pays → Razorpay sends payment details to frontend
// Frontend sends these to our backend for verification
// We verify the signature to make sure payment is genuine
export const verifyPayment = async (userId, {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    orderId,
}) => {
    // ─── Verify signature ─────────────────────────────────────
    // Razorpay signature = HMAC SHA256 of (orderId + "|" + paymentId)
    // If signatures match → payment is genuine
    const body = razorpayOrderId + "|" + razorpayPaymentId;

    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

    if (expectedSignature !== razorpaySignature) {
        throw { statusCode: 400, message: "Invalid payment signature. Payment verification failed." };
    }

    // ─── Update order payment status ──────────────────────────
    const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
            paymentStatus: "COMPLETED",
            paymentId: razorpayPaymentId,
        },
    });

    return {
        message: "Payment verified successfully! Your order is confirmed.",
        order: {
            id: updatedOrder.id,
            paymentStatus: updatedOrder.paymentStatus,
            paymentId: updatedOrder.paymentId,
            status: updatedOrder.status,
        },
    };
};

// ─── GET PAYMENT STATUS ───────────────────────────────────────
// Check payment status of an order
export const getPaymentStatus = async (userId, orderId) => {
    const order = await prisma.order.findFirst({
        where: { id: orderId, userId },
        select: {
            id: true,
            paymentStatus: true,
            paymentMethod: true,
            paymentId: true,
            totalAmount: true,
        },
    });

    if (!order) {
        throw { statusCode: 404, message: "Order not found." };
    }

    return order;
};