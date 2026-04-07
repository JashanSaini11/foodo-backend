// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// All address related API endpoints
// All routes protected — user must be logged in

import express from "express";
import * as addressController from "./address.controller.js";
import { protect } from "../../../middlewares/auth.middleware.js";
import { addressRules, pincodeRules, validate } from "./address.validation.js";

const router = express.Router();

// ─── IMPORTANT: specific routes before dynamic routes ─────────
// /from-pincode must come BEFORE /:id
// Otherwise Express will treat "from-pincode" as an :id param

// @GET /api/users/addresses/from-pincode?pincode=141001
// Converts pincode to full address using Google Maps
router.get("/from-pincode", protect, pincodeRules, validate, addressController.getAddressFromPincode);

// @POST /api/users/addresses
// Adds a new address for logged in user
// Body: { label, addressLine1, addressLine2?, city, state, pincode, latitude, longitude }
router.post("/", protect, addressRules, validate, addressController.addAddress);

// @GET /api/users/addresses
// Gets all saved addresses (default address first)
router.get("/", protect, addressController.getAddresses);

// @PUT /api/users/addresses/:id
// Updates an existing address
router.put("/:id", protect, addressRules, validate, addressController.updateAddress);

// @DELETE /api/users/addresses/:id
// Deletes an address (auto sets next as default if needed)
router.delete("/:id", protect, addressController.deleteAddress);

// @PATCH /api/users/addresses/:id/default
// Sets an address as the default delivery address
router.patch("/:id/default", protect, addressController.setDefaultAddress);

export default router;