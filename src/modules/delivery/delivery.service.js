// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// All business logic for delivery partner management
// Handles: registration, profile, availability, delivery requests,
//          status updates, location tracking, earnings history

import { prisma } from "../../config/db.js";
import { setCache, getCache, deleteCache } from "../../config/redis.js";
import Restaurant from "../restaurant/restaurant.model.js";

// ─── REGISTER AS DELIVERY PARTNER ────────────────────────────
// User must have USER role first → then register as partner
// Admin verifies the partner before they can start delivering
export const registerPartner = async (userId, data) => {
    // Check if already registered
    const existing = await prisma.deliveryPartner.findUnique({
        where: { userId },
    });
    if (existing) {
        throw { statusCode: 409, message: "You are already registered as a delivery partner." };
    }

    // Create delivery partner profile
    const partner = await prisma.deliveryPartner.create({
        data: {
            userId,
            vehicleType: data.vehicleType,
            vehicleNumber: data.vehicleNumber,
            isAvailable: false,  // starts unavailable until admin verifies
            isVerified: false,   // admin must verify
        },
    });

    // Update user role to DELIVERY_PARTNER
    await prisma.user.update({
        where: { id: userId },
        data: { role: "DELIVERY_PARTNER" },
    });

    return {
        message: "Registration successful! Your profile is under review. You will be notified once verified.",
        partner,
    };
};

// ─── GET PARTNER PROFILE ──────────────────────────────────────
export const getPartnerProfile = async (userId) => {
    const partner = await prisma.deliveryPartner.findUnique({
        where: { userId },
        include: {
            user: {
                select: {
                    name: true,
                    email: true,
                    phone: true,
                    avatar: true,
                },
            },
        },
    });

    if (!partner) {
        throw { statusCode: 404, message: "Delivery partner profile not found." };
    }

    return partner;
};

// ─── UPDATE PARTNER PROFILE ───────────────────────────────────
export const updatePartnerProfile = async (userId, data) => {
    const partner = await prisma.deliveryPartner.findUnique({
        where: { userId },
    });

    if (!partner) {
        throw { statusCode: 404, message: "Partner profile not found." };
    }

    const updated = await prisma.deliveryPartner.update({
        where: { userId },
        data: {
            ...(data.vehicleType && { vehicleType: data.vehicleType }),
            ...(data.vehicleNumber && { vehicleNumber: data.vehicleNumber }),
        },
    });

    return {
        message: "Profile updated successfully.",
        partner: updated,
    };
};

// ─── TOGGLE AVAILABILITY ──────────────────────────────────────
// Partner can go online/offline
// Must be verified before going online
export const toggleAvailability = async (userId, isAvailable) => {
    const partner = await prisma.deliveryPartner.findUnique({
        where: { userId },
    });

    if (!partner) {
        throw { statusCode: 404, message: "Partner profile not found." };
    }

    if (!partner.isVerified) {
        throw { statusCode: 403, message: "Your profile is not verified yet. Please wait for admin approval." };
    }

    const updated = await prisma.deliveryPartner.update({
        where: { userId },
        data: { isAvailable },
    });

    return {
        message: `You are now ${isAvailable ? "online 🟢" : "offline 🔴"}.`,
        isAvailable: updated.isAvailable,
    };
};

// ─── UPDATE CURRENT LOCATION ──────────────────────────────────
// Called frequently by partner app when they are on a delivery
// Stored in Redis for fast real-time access
// Also saved to PostgreSQL for last known location
export const updateLocation = async (userId, { latitude, longitude }) => {
    const partner = await prisma.deliveryPartner.findUnique({
        where: { userId },
        select: { id: true, isAvailable: true },
    });

    if (!partner) {
        throw { statusCode: 404, message: "Partner profile not found." };
    }

    // Save to Redis for real-time tracking (expires in 5 minutes)
    await setCache(
        `partner_location:${partner.id}`,
        { latitude, longitude, updatedAt: new Date() },
        5 * 60
    );

    // Save to PostgreSQL for last known location
    await prisma.deliveryPartner.update({
        where: { userId },
        data: {
            currentLat: latitude,
            currentLng: longitude,
        },
    });

    return { message: "Location updated." };
};

// ─── GET AVAILABLE DELIVERY REQUESTS ─────────────────────────
// Partner sees orders that are READY_FOR_PICKUP
// within their area (orders without a partner assigned)
export const getDeliveryRequests = async (userId) => {
    const partner = await prisma.deliveryPartner.findUnique({
        where: { userId },
    });

    if (!partner) {
        throw { statusCode: 404, message: "Partner profile not found." };
    }

    if (!partner.isVerified || !partner.isAvailable) {
        throw { statusCode: 403, message: "You must be verified and available to see delivery requests." };
    }

    // Get orders that are ready for pickup and have no delivery partner
    const orders = await prisma.order.findMany({
        where: {
            status: "READY_FOR_PICKUP",
            delivery: null, // no delivery assignment yet
        },
        include: {
            address: {
                select: {
                    addressLine1: true,
                    city: true,
                    latitude: true,
                    longitude: true,
                },
            },
            user: {
                select: {
                    name: true,
                    phone: true,
                },
            },
        },
        orderBy: { createdAt: "asc" }, // oldest first
        take: 10,
    });

    // Enrich with restaurant details from MongoDB
    const restaurantIds = [...new Set(orders.map((o) => o.restaurantId))];
    const restaurants = await Restaurant.find({
        _id: { $in: restaurantIds },
    }).select("name address location");

    const restaurantMap = {};
    restaurants.forEach((r) => {
        restaurantMap[r._id.toString()] = r;
    });

    const enrichedOrders = orders.map((order) => ({
        ...order,
        restaurant: restaurantMap[order.restaurantId] || null,
    }));

    return {
        count: enrichedOrders.length,
        requests: enrichedOrders,
    };
};

// ─── ACCEPT DELIVERY REQUEST ──────────────────────────────────
// Partner accepts an order → creates DeliveryAssignment
export const acceptDelivery = async (userId, orderId) => {
    const partner = await prisma.deliveryPartner.findUnique({
        where: { userId },
    });

    if (!partner) {
        throw { statusCode: 404, message: "Partner profile not found." };
    }

    if (!partner.isVerified || !partner.isAvailable) {
        throw { statusCode: 403, message: "You must be verified and available to accept deliveries." };
    }

    // Check order is still available
    const order = await prisma.order.findFirst({
        where: {
            id: orderId,
            status: "READY_FOR_PICKUP",
            delivery: null,
        },
    });

    if (!order) {
        throw { statusCode: 404, message: "Order not found or already taken by another partner." };
    }

    // Use transaction — create assignment + update order status together
    const [assignment] = await prisma.$transaction([
        // Create delivery assignment
        prisma.deliveryAssignment.create({
            data: {
                orderId,
                partnerId: partner.id,
            },
        }),
        // Update order status
        prisma.order.update({
            where: { id: orderId },
            data: { status: "OUT_FOR_DELIVERY" },
        }),
        // Make partner unavailable for new orders
        prisma.deliveryPartner.update({
            where: { id: partner.id },
            data: { isAvailable: false },
        }),
    ]);

    return {
        message: "Delivery accepted! Head to the restaurant for pickup.",
        assignment,
    };
};

// ─── REJECT DELIVERY REQUEST ──────────────────────────────────
// Partner rejects an order → order goes back to available pool
export const rejectDelivery = async (userId, orderId) => {
    // Just verify partner exists — order stays in pool
    const partner = await prisma.deliveryPartner.findUnique({
        where: { userId },
    });

    if (!partner) {
        throw { statusCode: 404, message: "Partner profile not found." };
    }

    return { message: "Delivery request rejected." };
};

// ─── GET ACTIVE DELIVERY ──────────────────────────────────────
// Get partner's current active delivery
export const getActiveDelivery = async (userId) => {
    const partner = await prisma.deliveryPartner.findUnique({
        where: { userId },
        select: { id: true },
    });

    if (!partner) {
        throw { statusCode: 404, message: "Partner profile not found." };
    }

    const assignment = await prisma.deliveryAssignment.findFirst({
        where: {
            partnerId: partner.id,
            deliveredAt: null, // not yet delivered
        },
        include: {
            order: {
                include: {
                    address: true,
                    user: {
                        select: {
                            name: true,
                            phone: true,
                        },
                    },
                },
            },
        },
    });

    if (!assignment) {
        return { hasActiveDelivery: false, delivery: null };
    }

    // Get restaurant details
    const restaurant = await Restaurant.findById(assignment.order.restaurantId)
        .select("name address location phone");

    return {
        hasActiveDelivery: true,
        delivery: {
            ...assignment,
            restaurant: restaurant || null,
        },
    };
};

// ─── GET DELIVERY HISTORY ─────────────────────────────────────
// Past completed deliveries with earnings
export const getDeliveryHistory = async (userId, { page = 1, limit = 10 }) => {
    const skip = (page - 1) * limit;

    const partner = await prisma.deliveryPartner.findUnique({
        where: { userId },
        select: { id: true, totalDeliveries: true, totalEarnings: true, rating: true },
    });

    if (!partner) {
        throw { statusCode: 404, message: "Partner profile not found." };
    }

    const [deliveries, total] = await Promise.all([
        prisma.deliveryAssignment.findMany({
            where: {
                partnerId: partner.id,
                deliveredAt: { not: null }, // completed deliveries
            },
            orderBy: { deliveredAt: "desc" },
            skip,
            take: limit,
            include: {
                order: {
                    select: {
                        totalAmount: true,
                        status: true,
                        createdAt: true,
                    },
                },
            },
        }),
        prisma.deliveryAssignment.count({
            where: {
                partnerId: partner.id,
                deliveredAt: { not: null },
            },
        }),
    ]);

    return {
        stats: {
            totalDeliveries: partner.totalDeliveries,
            totalEarnings: partner.totalEarnings,
            rating: partner.rating,
        },
        deliveries,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
};