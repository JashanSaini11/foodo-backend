// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// All business logic for address management
// Handles: add, get all, update, delete, set default, pincode lookup

import { Client } from "@googlemaps/google-maps-services-js";
import { prisma } from "../../../config/db.js";

// Google Maps client instance
const googleMapsClient = new Client({});

// ─── ADD ADDRESS ──────────────────────────────────────────────
// Saves a new address for the logged in user
// If it's the user's first address → auto set as default
export const addAddress = async (userId, addressData) => {
    // Check how many addresses user already has
    const existingCount = await prisma.address.count({
        where: { userId },
    });

    // If this is their first address → make it default automatically
    const isDefault = existingCount === 0 ? true : false;

    const address = await prisma.address.create({
        data: {
            userId,
            ...addressData,
            isDefault,
        },
    });

    return {
        message: "Address added successfully.",
        address,
    };
};

// ─── GET ALL ADDRESSES ────────────────────────────────────────
// Returns all saved addresses for the user
// Default address comes first in the list
export const getAddresses = async (userId) => {
    const addresses = await prisma.address.findMany({
        where: { userId },
        orderBy: [
            { isDefault: "desc" }, // default address first
            { createdAt: "desc" },  // then newest first
        ],
    });

    return addresses;
};

// ─── UPDATE ADDRESS ───────────────────────────────────────────
// Updates an existing address — only owner can update it
export const updateAddress = async (userId, addressId, addressData) => {
    // Check address exists and belongs to this user
    const existing = await prisma.address.findFirst({
        where: { id: addressId, userId },
    });

    if (!existing) {
        throw { statusCode: 404, message: "Address not found." };
    }

    const updated = await prisma.address.update({
        where: { id: addressId },
        data: addressData,
    });

    return {
        message: "Address updated successfully.",
        address: updated,
    };
};

// ─── DELETE ADDRESS ───────────────────────────────────────────
// Deletes an address — only owner can delete
// If deleted address was default → auto set next address as default
export const deleteAddress = async (userId, addressId) => {
    // Check address exists and belongs to this user
    const existing = await prisma.address.findFirst({
        where: { id: addressId, userId },
    });

    if (!existing) {
        throw { statusCode: 404, message: "Address not found." };
    }

    await prisma.address.delete({ where: { id: addressId } });

    // If deleted address was the default one
    // → find next address and make it default
    if (existing.isDefault) {
        const nextAddress = await prisma.address.findFirst({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });

        if (nextAddress) {
            await prisma.address.update({
                where: { id: nextAddress.id },
                data: { isDefault: true },
            });
        }
    }

    return { message: "Address deleted successfully." };
};

// ─── SET DEFAULT ADDRESS ──────────────────────────────────────
// Sets one address as default → removes default from all others
// Uses a transaction so both operations happen together or not at all
export const setDefaultAddress = async (userId, addressId) => {
    // Check address exists and belongs to this user
    const existing = await prisma.address.findFirst({
        where: { id: addressId, userId },
    });

    if (!existing) {
        throw { statusCode: 404, message: "Address not found." };
    }

    // Transaction: remove all defaults → set new default
    // If either step fails → both are rolled back
    await prisma.$transaction([
        // Step 1: Remove default from ALL user addresses
        prisma.address.updateMany({
            where: { userId },
            data: { isDefault: false },
        }),
        // Step 2: Set new default
        prisma.address.update({
            where: { id: addressId },
            data: { isDefault: true },
        }),
    ]);

    return { message: "Default address updated successfully." };
};

// ─── PINCODE TO ADDRESS (Google Geocoding) ────────────────────
// Converts a pincode into full address with lat/lng
// Used when user types pincode instead of using GPS
export const getAddressFromPincode = async (pincode) => {
    try {
        const response = await googleMapsClient.geocode({
            params: {
                address: `${pincode}, India`,
                key: process.env.GOOGLE_MAPS_API_KEY,
            },
        });

        const results = response.data.results;

        if (!results || results.length === 0) {
            throw { statusCode: 404, message: "No address found for this pincode." };
        }

        const result = results[0];

        // Extract address components from Google response
        const components = result.address_components;

        // Helper to find specific component type
        const getComponent = (type) => {
            const comp = components.find((c) => c.types.includes(type));
            return comp ? comp.long_name : "";
        };

        return {
            formattedAddress: result.formatted_address,
            latitude: result.geometry.location.lat,
            longitude: result.geometry.location.lng,
            city:
                getComponent("locality") ||
                getComponent("administrative_area_level_2"),
            state: getComponent("administrative_area_level_1"),
            pincode: getComponent("postal_code") || pincode,
        };
    } catch (err) {
        // If it's our custom error, rethrow it
        console.log("Google Maps Error:", err);
        if (err.statusCode) throw err;
        throw { statusCode: 500, message: "Failed to fetch address from pincode." };
    }
};