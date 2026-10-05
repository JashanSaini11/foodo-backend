// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// All business logic for admin operations
// Only ADMIN role can access these functions
// Handles: stats, user management, restaurant verification,
//          delivery partner verification, order management

import { prisma } from "../../config/db.js";
import Restaurant from "../restaurant/restaurant.model.js";

// ══════════════════════════════════════════════════════════════
// DASHBOARD STATS
// ══════════════════════════════════════════════════════════════

// ─── GET DASHBOARD STATS ──────────────────────────────────────
// Returns overview numbers for admin dashboard
export const getDashboardStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    // Run all queries in parallel for speed
    const [
        totalUsers,
        totalOrders,
        totalRestaurants,
        totalDeliveryPartners,
        ordersToday,
        ordersThisWeek,
        ordersThisMonth,
        revenueToday,
        revenueThisWeek,
        revenueThisMonth,
        pendingOrders,
        activeDeliveryPartners,
    ] = await Promise.all([
        // Users
        prisma.user.count({ where: { role: "USER" } }),

        // Orders
        prisma.order.count(),

        // Restaurants (from MongoDB)
        Restaurant.countDocuments({ isActive: true }),

        // Delivery Partners
        prisma.deliveryPartner.count({ where: { isVerified: true } }),

        // Orders today
        prisma.order.count({
            where: { createdAt: { gte: today } },
        }),

        // Orders this week
        prisma.order.count({
            where: { createdAt: { gte: weekAgo } },
        }),

        // Orders this month
        prisma.order.count({
            where: { createdAt: { gte: monthAgo } },
        }),

        // Revenue today (completed payments only)
        prisma.order.aggregate({
            where: {
                createdAt: { gte: today },
                paymentStatus: "COMPLETED",
            },
            _sum: { totalAmount: true },
        }),

        // Revenue this week
        prisma.order.aggregate({
            where: {
                createdAt: { gte: weekAgo },
                paymentStatus: "COMPLETED",
            },
            _sum: { totalAmount: true },
        }),

        // Revenue this month
        prisma.order.aggregate({
            where: {
                createdAt: { gte: monthAgo },
                paymentStatus: "COMPLETED",
            },
            _sum: { totalAmount: true },
        }),

        // Pending orders
        prisma.order.count({ where: { status: "PENDING" } }),

        // Active delivery partners
        prisma.deliveryPartner.count({
            where: { isAvailable: true, isVerified: true },
        }),
    ]);

    return {
        users: {
            total: totalUsers,
        },
        orders: {
            total: totalOrders,
            today: ordersToday,
            thisWeek: ordersThisWeek,
            thisMonth: ordersThisMonth,
            pending: pendingOrders,
        },
        revenue: {
            today: revenueToday._sum.totalAmount || 0,
            thisWeek: revenueThisWeek._sum.totalAmount || 0,
            thisMonth: revenueThisMonth._sum.totalAmount || 0,
        },
        restaurants: {
            total: totalRestaurants,
        },
        deliveryPartners: {
            total: totalDeliveryPartners,
            activeNow: activeDeliveryPartners,
        },
    };
};

// ══════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ══════════════════════════════════════════════════════════════

// ─── GET ALL USERS ────────────────────────────────────────────
export const getAllUsers = async ({ page = 1, limit = 20, role, search }) => {
    const skip = (page - 1) * limit;

    const where = {};
    if (role) where.role = role;
    if (search) {
        where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
        ];
    }

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                isVerified: true,
                isActive: true,
                provider: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
        }),
        prisma.user.count({ where }),
    ]);

    return {
        users,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
};

// ─── GET SINGLE USER ──────────────────────────────────────────
export const getUserById = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isVerified: true,
            isActive: true,
            provider: true,
            avatar: true,
            createdAt: true,
            orders: {
                select: {
                    id: true,
                    status: true,
                    totalAmount: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
                take: 5, // last 5 orders
            },
            addresses: true,
        },
    });

    if (!user) {
        throw { statusCode: 404, message: "User not found." };
    }

    return user;
};

// ─── TOGGLE USER STATUS ───────────────────────────────────────
// Activate or deactivate a user account
export const toggleUserStatus = async (userId, isActive) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw { statusCode: 404, message: "User not found." };
    }

    // Prevent admin from deactivating themselves
    if (user.role === "ADMIN") {
        throw { statusCode: 403, message: "Cannot deactivate an admin account." };
    }

    const updated = await prisma.user.update({
        where: { id: userId },
        data: { isActive },
        select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            role: true,
        },
    });

    return {
        message: `User account ${isActive ? "activated" : "deactivated"} successfully.`,
        user: updated,
    };
};

// ─── CHANGE USER ROLE ─────────────────────────────────────────
// Admin can change any user's role
export const changeUserRole = async (userId, role) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw { statusCode: 404, message: "User not found." };
    }

    const updated = await prisma.user.update({
        where: { id: userId },
        data: { role },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
        },
    });

    return {
        message: `User role changed to ${role} successfully.`,
        user: updated,
    };
};

// ══════════════════════════════════════════════════════════════
// RESTAURANT MANAGEMENT
// ══════════════════════════════════════════════════════════════

// ─── GET ALL RESTAURANTS ──────────────────────────────────────
export const getAllRestaurants = async ({ page = 1, limit = 20, isVerified, search }) => {
    const skip = (page - 1) * limit;

    const query = {};
    if (typeof isVerified === "boolean") query.isVerified = isVerified;
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: "i" } },
            { "address.city": { $regex: search, $options: "i" } },
        ];
    }

    const [restaurants, total] = await Promise.all([
        Restaurant.find(query)
            .select("name address cuisineTypes isVerified isActive isOpen avgRating coverImage ownerId createdAt")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Restaurant.countDocuments(query),
    ]);

    return {
        restaurants,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
};

// ─── VERIFY RESTAURANT ────────────────────────────────────────
// Admin approves a restaurant → it becomes visible to customers
export const verifyRestaurant = async (restaurantId, isVerified) => {
    const restaurant = await Restaurant.findByIdAndUpdate(
        restaurantId,
        { isVerified },
        { new: true }
    );

    if (!restaurant) {
        throw { statusCode: 404, message: "Restaurant not found." };
    }

    return {
        message: `Restaurant ${isVerified ? "verified ✅" : "unverified"} successfully.`,
        restaurant,
    };
};

// ─── TOGGLE RESTAURANT STATUS ─────────────────────────────────
// Admin can activate or deactivate a restaurant
export const toggleRestaurantStatus = async (restaurantId, isActive) => {
    const restaurant = await Restaurant.findByIdAndUpdate(
        restaurantId,
        { isActive },
        { new: true }
    );

    if (!restaurant) {
        throw { statusCode: 404, message: "Restaurant not found." };
    }

    return {
        message: `Restaurant ${isActive ? "activated" : "deactivated"} successfully.`,
        restaurant,
    };
};

// ══════════════════════════════════════════════════════════════
// DELIVERY PARTNER MANAGEMENT
// ══════════════════════════════════════════════════════════════

// ─── GET ALL DELIVERY PARTNERS ────────────────────────────────
export const getAllDeliveryPartners = async ({ page = 1, limit = 20, isVerified }) => {
    const skip = (page - 1) * limit;

    const where = {};
    if (typeof isVerified === "boolean") where.isVerified = isVerified;

    const [partners, total] = await Promise.all([
        prisma.deliveryPartner.findMany({
            where,
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
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
        }),
        prisma.deliveryPartner.count({ where }),
    ]);

    return {
        partners,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
};

// ─── VERIFY DELIVERY PARTNER ──────────────────────────────────
// Admin approves a delivery partner → they can start delivering
export const verifyDeliveryPartner = async (partnerId, isVerified) => {
    const partner = await prisma.deliveryPartner.findUnique({
        where: { id: partnerId },
    });

    if (!partner) {
        throw { statusCode: 404, message: "Delivery partner not found." };
    }

    const updated = await prisma.deliveryPartner.update({
        where: { id: partnerId },
        data: { isVerified },
        include: {
            user: {
                select: { name: true, email: true },
            },
        },
    });

    return {
        message: `Delivery partner ${isVerified ? "verified ✅" : "unverified"} successfully.`,
        partner: updated,
    };
};

// ══════════════════════════════════════════════════════════════
// ORDER MANAGEMENT
// ══════════════════════════════════════════════════════════════

// ─── GET ALL ORDERS ───────────────────────────────────────────
export const getAllOrders = async ({ page = 1, limit = 20, status }) => {
    const skip = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
        prisma.order.findMany({
            where,
            include: {
                user: {
                    select: { name: true, email: true, phone: true },
                },
                address: true,
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
        }),
        prisma.order.count({ where }),
    ]);

    // Enrich with restaurant names
    const restaurantIds = [...new Set(orders.map((o) => o.restaurantId).filter(Boolean))];
    const restaurants = restaurantIds.length
        ? await Restaurant.find({ _id: { $in: restaurantIds } }).select("name")
        : [];

    const restaurantMap = new Map(restaurants.map((r)=> [r._id, r.name]));
    restaurants.forEach((r) => {
        restaurantMap.set(r._id.toString(), r.name);
    });

    const enrichedOrders = orders.map((order) => ({
        ...order,
        restaurantName: restaurantMap.get(order.restaurantId) || "Unknown",
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