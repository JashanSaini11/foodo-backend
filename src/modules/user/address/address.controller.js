// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Handles HTTP requests for address management
// Thin layer — just calls service and sends response

import * as addressService from "./address.service.js";
import { successResponse, errorResponse } from "../../../utils/response.js";

// ─── ADD ADDRESS ──────────────────────────────────────────────
// POST /api/users/addresses
export const addAddress = async (req, res) => {
    try {
        const result = await addressService.addAddress(req.user.id, req.body);
        return successResponse(res, {
            statusCode: 201,
            message: result.message,
            data: { address: result.address },
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// ─── GET ALL ADDRESSES ────────────────────────────────────────
// GET /api/users/addresses
export const getAddresses = async (req, res) => {
    try {
        const addresses = await addressService.getAddresses(req.user.id);
        return successResponse(res, {
            statusCode: 200,
            message: "Addresses fetched successfully.",
            data: {
                count: addresses.length,
                addresses,
            },
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// ─── UPDATE ADDRESS ───────────────────────────────────────────
// PUT /api/users/addresses/:id
export const updateAddress = async (req, res) => {
    try {
        const result = await addressService.updateAddress(
            req.user.id,
            req.params.id,
            req.body
        );
        return successResponse(res, {
            statusCode: 200,
            message: result.message,
            data: { address: result.address },
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// ─── DELETE ADDRESS ───────────────────────────────────────────
// DELETE /api/users/addresses/:id
export const deleteAddress = async (req, res) => {
    try {
        const result = await addressService.deleteAddress(req.user.id, req.params.id);
        return successResponse(res, {
            statusCode: 200,
            message: result.message,
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// ─── SET DEFAULT ADDRESS ──────────────────────────────────────
// PATCH /api/users/addresses/:id/default
export const setDefaultAddress = async (req, res) => {
    try {
        const result = await addressService.setDefaultAddress(req.user.id, req.params.id);
        return successResponse(res, {
            statusCode: 200,
            message: result.message,
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};

// ─── GET ADDRESS FROM PINCODE ─────────────────────────────────
// GET /api/users/addresses/from-pincode?pincode=141001
export const getAddressFromPincode = async (req, res) => {
    try {
        const { pincode } = req.query;
        const address = await addressService.getAddressFromPincode(pincode);
        return successResponse(res, {
            statusCode: 200,
            message: "Address fetched from pincode.",
            data: { address },
        });
    } catch (err) {
        return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
    }
};