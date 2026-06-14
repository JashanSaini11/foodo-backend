// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Handles HTTP requests for admin operations
// All routes protected with ADMIN role

import * as adminService from "./admin.service.js";
import { successResponse, errorResponse } from "../../utils/response.js";

// ─── DASHBOARD STATS ──────────────────────────────────────────
// GET /api/admin/stats
export const getDashboardStats = async (req, res) => {
    try {
        const stats = await adminService.getDashboardStats();
        return successResponse(res, {
            statusCode: 200,
            message: "Dashboard stats fetched.",
            data: stats,
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// ══════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ══════════════════════════════════════════════════════════════

// GET /api/admin/users?page=1&limit=20&role=USER&search=john
export const getAllUsers = async (req, res) => {
    try {
        const { page, limit, role, search } = req.query;
        const result = await adminService.getAllUsers({
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            role,
            search,
        });
        return successResponse(res, {
            statusCode: 200,
            message: "Users fetched successfully.",
            data: result,
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// GET /api/admin/users/:id
export const getUserById = async (req, res) => {
    try {
        const user = await adminService.getUserById(req.params.id);
        return successResponse(res, {
            statusCode: 200,
            message: "User fetched successfully.",
            data: { user },
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// PATCH /api/admin/users/:id/status
// Body: { isActive: true/false }
export const toggleUserStatus = async (req, res) => {
    try {
        const result = await adminService.toggleUserStatus(
            req.params.id,
            req.body.isActive
        );
        return successResponse(res, {
            statusCode: 200,
            message: result.message,
            data: { user: result.user },
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// PATCH /api/admin/users/:id/role
// Body: { role: "USER" | "RESTAURANT_OWNER" | "DELIVERY_PARTNER" | "ADMIN" }
export const changeUserRole = async (req, res) => {
    try {
        const result = await adminService.changeUserRole(
            req.params.id,
            req.body.role
        );
        return successResponse(res, {
            statusCode: 200,
            message: result.message,
            data: { user: result.user },
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// ══════════════════════════════════════════════════════════════
// RESTAURANT MANAGEMENT
// ══════════════════════════════════════════════════════════════

// GET /api/admin/restaurants?page=1&isVerified=false&search=pizza
export const getAllRestaurants = async (req, res) => {
    try {
        const { page, limit, isVerified, search } = req.query;
        const result = await adminService.getAllRestaurants({
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            isVerified: isVerified !== undefined ? isVerified === "true" : undefined,
            search,
        });
        return successResponse(res, {
            statusCode: 200,
            message: "Restaurants fetched successfully.",
            data: result,
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// PATCH /api/admin/restaurants/:id/verify
// Body: { isVerified: true/false }
export const verifyRestaurant = async (req, res) => {
    try {
        const result = await adminService.verifyRestaurant(
            req.params.id,
            req.body.isVerified
        );
        return successResponse(res, {
            statusCode: 200,
            message: result.message,
            data: { restaurant: result.restaurant },
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// PATCH /api/admin/restaurants/:id/status
// Body: { isActive: true/false }
export const toggleRestaurantStatus = async (req, res) => {
    try {
        const result = await adminService.toggleRestaurantStatus(
            req.params.id,
            req.body.isActive
        );
        return successResponse(res, {
            statusCode: 200,
            message: result.message,
            data: { restaurant: result.restaurant },
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// ══════════════════════════════════════════════════════════════
// DELIVERY PARTNER MANAGEMENT
// ══════════════════════════════════════════════════════════════

// GET /api/admin/delivery-partners?page=1&isVerified=false
export const getAllDeliveryPartners = async (req, res) => {
    try {
        const { page, limit, isVerified } = req.query;
        const result = await adminService.getAllDeliveryPartners({
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            isVerified: isVerified !== undefined ? isVerified === "true" : undefined,
        });
        return successResponse(res, {
            statusCode: 200,
            message: "Delivery partners fetched successfully.",
            data: result,
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// PATCH /api/admin/delivery-partners/:id/verify
// Body: { isVerified: true/false }
export const verifyDeliveryPartner = async (req, res) => {
    try {
        const result = await adminService.verifyDeliveryPartner(
            req.params.id,
            req.body.isVerified
        );
        return successResponse(res, {
            statusCode: 200,
            message: result.message,
            data: { partner: result.partner },
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// ══════════════════════════════════════════════════════════════
// ORDER MANAGEMENT
// ══════════════════════════════════════════════════════════════

// GET /api/admin/orders?page=1&status=PENDING
export const getAllOrders = async (req, res) => {
    try {
        const { page, limit, status } = req.query;
        const result = await adminService.getAllOrders({
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            status,
        });
        return successResponse(res, {
            statusCode: 200,
            message: "Orders fetched successfully.",
            data: result,
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};