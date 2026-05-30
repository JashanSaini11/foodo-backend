// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Handles HTTP requests for delivery partner operations
// Thin layer — reads request, calls service, sends response

import * as deliveryService from "./delivery.service.js";
import { successResponse, errorResponse } from "../../utils/response.js";

// ─── REGISTER AS PARTNER ──────────────────────────────────────
// POST /api/delivery/register
export const registerPartner = async (req, res) => {
    try {
        const result = await deliveryService.registerPartner(req.user.id, req.body);
        return successResponse(res, {
            statusCode: 201,
            message: result.message,
            data: { partner: result.partner },
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// ─── GET PARTNER PROFILE ──────────────────────────────────────
// GET /api/delivery/profile
export const getPartnerProfile = async (req, res) => {
    try {
        const partner = await deliveryService.getPartnerProfile(req.user.id);
        return successResponse(res, {
            statusCode: 200,
            message: "Profile fetched successfully.",
            data: { partner },
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// ─── UPDATE PARTNER PROFILE ───────────────────────────────────
// PUT /api/delivery/profile
export const updatePartnerProfile = async (req, res) => {
    try {
        const result = await deliveryService.updatePartnerProfile(req.user.id, req.body);
        return successResponse(res, {
            statusCode: 200,
            message: result.message,
            data: { partner: result.partner },
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// ─── TOGGLE AVAILABILITY ──────────────────────────────────────
// PATCH /api/delivery/availability
// Body: { isAvailable: true/false }
export const toggleAvailability = async (req, res) => {
    try {
        const result = await deliveryService.toggleAvailability(
            req.user.id,
            req.body.isAvailable
        );
        return successResponse(res, {
            statusCode: 200,
            message: result.message,
            data: { isAvailable: result.isAvailable },
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// ─── UPDATE LOCATION ──────────────────────────────────────────
// PATCH /api/delivery/location
// Body: { latitude, longitude }
export const updateLocation = async (req, res) => {
    try {
        const result = await deliveryService.updateLocation(req.user.id, req.body);
        return successResponse(res, {
            statusCode: 200,
            message: result.message,
            data: null,
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// ─── GET DELIVERY REQUESTS ────────────────────────────────────
// GET /api/delivery/requests
export const getDeliveryRequests = async (req, res) => {
    try {
        const result = await deliveryService.getDeliveryRequests(req.user.id);
        return successResponse(res, {
            statusCode: 200,
            message: "Delivery requests fetched.",
            data: result,
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// ─── ACCEPT DELIVERY ──────────────────────────────────────────
// POST /api/delivery/requests/:orderId/accept
export const acceptDelivery = async (req, res) => {
    try {
        const result = await deliveryService.acceptDelivery(
            req.user.id,
            req.params.orderId
        );
        return successResponse(res, {
            statusCode: 200,
            message: result.message,
            data: { assignment: result.assignment },
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// ─── REJECT DELIVERY ──────────────────────────────────────────
// POST /api/delivery/requests/:orderId/reject
export const rejectDelivery = async (req, res) => {
    try {
        const result = await deliveryService.rejectDelivery(
            req.user.id,
            req.params.orderId
        );
        return successResponse(res, {
            statusCode: 200,
            message: result.message,
            data: null,
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// ─── GET ACTIVE DELIVERY ──────────────────────────────────────
// GET /api/delivery/active
export const getActiveDelivery = async (req, res) => {
    try {
        const result = await deliveryService.getActiveDelivery(req.user.id);
        return successResponse(res, {
            statusCode: 200,
            message: result.hasActiveDelivery
                ? "Active delivery fetched."
                : "No active delivery.",
            data: result,
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// ─── GET DELIVERY HISTORY ─────────────────────────────────────
// GET /api/delivery/history?page=1&limit=10
export const getDeliveryHistory = async (req, res) => {
    try {
        const { page, limit } = req.query;
        const result = await deliveryService.getDeliveryHistory(req.user.id, {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
        });
        return successResponse(res, {
            statusCode: 200,
            message: "Delivery history fetched.",
            data: result,
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};