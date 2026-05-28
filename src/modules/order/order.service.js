// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// All business logic for order management
// Connects: Cart (Redis) + Address (PostgreSQL) + Restaurant (MongoDB)
// Creates order in PostgreSQL → clears cart → notifies restaurant

import { prisma } from "../../config/db.js";
import { getCart, clearCart } from "./cart/cart.service.js";
import Restaurant from "../restaurant/restaurant.model.js";
import { FoodItem } from "../restaurant/menu/menu.model.js";

// ─── HELPER: Generate 4-digit delivery OTP ────────────────────
// Used to verify delivery — partner enters OTP when delivering
const generateDeliveryOTP = () =>
    Math.floor(1000 + Math.random() * 9000).toString();

// ─── PLACE ORDER ──────────────────────────────────────────────
// Flow:
// 1. Validate cart exists
// 2. Validate address belongs to user
// 3. Validate restaurant is open
// 4. Create order in PostgreSQL
// 5. Clear cart from Redis


export const placeOrder = async (userId, { addressId, paymentMethod, specialInstructions }) => {

    // ─── Step 1: Get cart from Redis ──────────────────────────
    const { cart, isEmpty } = await getCart(userId);
    if (isEmpty || !cart) {
        throw { statusCode: 400, message: "Your cart is empty. Please add items before ordering." };
    }

    // ─── Step 2: Validate address belongs to this user ────────
    const address = await prisma.address.findFirst({
        where: { id: addressId, userId },
    });
    if (!address) {
        throw { statusCode: 404, message: "Address not found." };
    }

    // ─── Step 3: Validate restaurant exists and is open ───────
    const restaurant = await Restaurant.findById(cart.restaurantId);
    if (!restaurant) {
        throw { statusCode: 404, message: "Restaurant not found." };
    }
    if (!restaurant.isOpen) {
        throw { statusCode: 400, message: "This restaurant is currently closed." };
    }

    // ─── Step 4: Validate minimum order amount ────────────────
    if (cart.subtotal < restaurant.minOrderAmount) {
        throw {
            statusCode: 400,
            message: `Minimum order amount is ₹${restaurant.minOrderAmount}. Your cart total is ₹${cart.subtotal}.`,
        };
    }

    // ─── Step 5: Generate delivery OTP ────────────────────────
    const deliveryOTP = generateDeliveryOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // ─── Step 6: Create order in PostgreSQL ───────────────────
    const order = await prisma.order.create({
        data: {
            userId,
            addressId,
            restaurantId: cart.restaurantId,
            totalAmount: cart.totalAmount,
            deliveryFee: cart.deliveryFee,
            paymentMethod,
            paymentStatus: paymentMethod === "CASH_ON_DELIVERY" ? "PENDING" : "PENDING",
            status: "PENDING",
            otp: deliveryOTP,
            otpExpiresAt,
            estimatedTime: restaurant.avgDeliveryTime,
        },
        include: {
            address: true,
        },
    });

    // ─── Step 7: Clear cart from Redis ────────────────────────
    await clearCart(userId);

    return {
        message: "Order placed successfully!",
        order: {
            id: order.id,
            status: order.status,
            totalAmount: order.totalAmount,
            deliveryFee: order.deliveryFee,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            estimatedTime: order.estimatedTime,
            restaurantId: cart.restaurantId,
            restaurantName: cart.restaurantName,
            address: order.address,
            createdAt: order.createdAt,
        },
    };
};

// ─── GET MY ORDERS ────────────────────────────────────────────
// Returns all orders for the logged in user
// Most recent first
export const getMyOrders = async (userId, { page = 1, limit = 10 }) => {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
        prisma.order.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
            include: {
                address: {
                    select: {
                        label: true,
                        addressLine1: true,
                        city: true,
                    },
                },
            },
        }),
        prisma.order.count({ where: { userId } }),
    ]);

    // Fetch restaurant names from MongoDB for each order
    const restaurantIds = [...new Set(orders.map((o) => o.restaurantId))];
    const restaurants = await Restaurant.find({
        _id: { $in: restaurantIds },
    }).select("name coverImage");

    // Map restaurant data to orders
    const restaurantMap = {};
    restaurants.forEach((r) => {
        restaurantMap[r._id.toString()] = {
            name: r.name,
            image: r.coverImage,
        };
    });

    const enrichedOrders = orders.map((order) => ({
        ...order,
        restaurant: restaurantMap[order.restaurantId] || null,
    }));

    return {
        orders: enrichedOrders,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
};

// ─── GET SINGLE ORDER ─────────────────────────────────────────
// Returns full order details
export const getOrderById = async (userId, orderId) => {
    const order = await prisma.order.findFirst({
        where: { id: orderId, userId },
        include: {
            address: true,
            delivery: {
                include: {
                    partner: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                    phone: true,
                                    avatar: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!order) {
        throw { statusCode: 404, message: "Order not found." };
    }

    // Get restaurant details from MongoDB
    const restaurant = await Restaurant.findById(order.restaurantId).select(
        "name coverImage address phone"
    );

    return {
        ...order,
        restaurant: restaurant || null,
    };
};

// ─── CANCEL ORDER ─────────────────────────────────────────────
// User can only cancel if order is PENDING
// Once restaurant accepts → cannot cancel
export const cancelOrder = async (userId, orderId, reason) => {
    const order = await prisma.order.findFirst({
        where: { id: orderId, userId },
    });

    if (!order) {
        throw { statusCode: 404, message: "Order not found." };
    }

    // Only PENDING orders can be cancelled by user
    if (order.status !== "PENDING") {
        throw {
            statusCode: 400,
            message: `Cannot cancel order. Current status is ${order.status}. You can only cancel pending orders.`,
        };
    }

    const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
            status: "CANCELLED",
            cancelReason: reason || "Cancelled by user",
        },
    });

    return {
        message: "Order cancelled successfully.",
        order: updatedOrder,
    };
};

// ─── GET RESTAURANT ORDERS (Restaurant owner view) ────────────
// Restaurant owner sees incoming orders for their restaurant
export const getRestaurantOrders = async (restaurantId, { status, page = 1, limit = 20 }) => {
    const skip = (page - 1) * limit;

    const where = { restaurantId };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
        prisma.order.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
            include: {
                user: {
                    select: {
                        name: true,
                        phone: true,
                    },
                },
                address: true,
            },
        }),
        prisma.order.count({ where }),
    ]);

    return {
        orders,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
};

// ─── UPDATE ORDER STATUS (Restaurant owner) ───────────────────
// Restaurant updates order through these states:
// PENDING → ACCEPTED → PREPARING → READY_FOR_PICKUP
export const updateOrderStatus = async (restaurantId, orderId, status) => {
    // Validate status transition
    const validTransitions = {
        PENDING: ["ACCEPTED", "REJECTED"],
        ACCEPTED: ["PREPARING"],
        PREPARING: ["READY_FOR_PICKUP"],
        READY_FOR_PICKUP: [], // delivery partner handles next steps
    };

    const order = await prisma.order.findFirst({
        where: { id: orderId, restaurantId },
    });

    if (!order) {
        throw { statusCode: 404, message: "Order not found." };
    }

    const allowedStatuses = validTransitions[order.status] || [];
    if (!allowedStatuses.includes(status)) {
        throw {
            statusCode: 400,
            message: `Cannot change status from ${order.status} to ${status}.`,
        };
    }

    const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status },
    });

    return {
        message: `Order status updated to ${status}.`,
        order: updatedOrder,
    };
};

// ─── VERIFY DELIVERY OTP ──────────────────────────────────────
// Delivery partner enters OTP from customer to confirm delivery
export const verifyDeliveryOTP = async (orderId, otp) => {
    const order = await prisma.order.findFirst({
        where: { id: orderId, status: "OUT_FOR_DELIVERY" },
    });

    if (!order) {
        throw { statusCode: 404, message: "Order not found or not out for delivery." };
    }

    // Check OTP expiry
    if (order.otpExpiresAt && new Date() > order.otpExpiresAt) {
        throw { statusCode: 400, message: "OTP has expired." };
    }

    // Verify OTP
    if (order.otp !== otp) {
        throw { statusCode: 400, message: "Invalid OTP. Please try again." };
    }

    // Mark as delivered
    const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
            status: "DELIVERED",
            paymentStatus: order.paymentMethod === "CASH_ON_DELIVERY" ? "COMPLETED" : order.paymentStatus,
            otp: null, // clear OTP after use
        },
    });

    // Update delivery assignment
    await prisma.deliveryAssignment.updateMany({
        where: { orderId },
        data: { deliveredAt: new Date() },
    });

    return {
        message: "Order delivered successfully!",
        order: updatedOrder,
    };
};