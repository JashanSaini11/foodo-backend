// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Mongoose model for Restaurant — stored in MongoDB
// MongoDB is used here because restaurant data is flexible:
// cuisines, timings, menu — all vary per restaurant
// location field uses GeoJSON Point for geospatial queries

import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema(
    {
        // Links to the PostgreSQL users table (UUID string, not ObjectId)
        ownerId: { type: String, required: true, index: true },

        // ─── Basic Info ───────────────────────────────────────────
        name: { type: String, required: true, trim: true, maxlength: 100 },
        description: { type: String, trim: true, maxlength: 500 },
        image: { type: String },                 // Cloudinary URL
        cuisineTypes: [{ type: String, trim: true }],

        // ─── Address ──────────────────────────────────────────────
        address: {
            addressLine1: { type: String, required: true },
            addressLine2: { type: String },
            city: { type: String, required: true },
            state: { type: String, required: true },
            pincode: { type: String, required: true },
        },

        // ─── GeoJSON Point (required for $near / $geoWithin queries) ──
        // IMPORTANT: MongoDB uses [longitude, latitude] order
        location: {
            type: { type: String, enum: ["Point"], default: "Point" },
            coordinates: { type: [Number], required: true }, // [lng, lat]
        },

        // ─── Operating Hours ──────────────────────────────────────
        timings: {
            open: { type: String, required: true },   // "09:00"
            close: { type: String, required: true },  // "22:00"
            days: [{ type: String, enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] }],
        },

        // ─── Delivery Settings ────────────────────────────────────
        deliveryRadius: { type: Number, default: 5 },     // km
        minOrderAmount: { type: Number, default: 0 },     // ₹
        deliveryFee: { type: Number, default: 0 },        // ₹
        avgDeliveryTime: { type: Number, default: 30 },   // minutes

        // ─── Ratings (updated after each order is rated) ──────────
        avgRating: { type: Number, default: 0, min: 0, max: 5 },
        totalRatings: { type: Number, default: 0 },

        // ─── Status ───────────────────────────────────────────────
        isActive: { type: Boolean, default: true },
        isVerified: { type: Boolean, default: false }, // admin-verified

        // ─── Google Places (Phase 3) ──────────────────────────────
        googlePlaceId: { type: String, sparse: true },
    },
    { timestamps: true }
);

// 2dsphere index enables geospatial queries ($near, $geoWithin)
restaurantSchema.index({ location: "2dsphere" });
restaurantSchema.index({ isActive: 1, isVerified: 1 });

const Restaurant = mongoose.model("Restaurant", restaurantSchema);
export default Restaurant;