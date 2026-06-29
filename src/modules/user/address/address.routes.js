// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// All address related API endpoints
// All routes protected — user must be logged in

import express from "express";
import * as addressController from "./address.controller.js";
import { protect } from "../../../middlewares/auth.middleware.js";
import { addressRules, pincodeRules, coordinateRules, validate } from "./address.validation.js";

const router = express.Router();

// ─── IMPORTANT: specific routes before dynamic routes ─────────
// /from-pincode must come BEFORE /:id
// Otherwise Express will treat "from-pincode" as an :id param

// @GET /api/users/addresses/from-pincode?pincode=141001
// Converts pincode to full address using Google Maps
/**
 * @swagger
 * /api/users/addresses/from-pincode:
 *   get:
 *     summary: Get address from pincode
 *     tags: [Addresses]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: pincode
 *         required: true
 *         schema:
 *           type: string
 *           example: "141001"
 *         description: Pincode to convert to address details
 *     responses:
 *       200:
 *         description: Address details fetched successfully
 *       400:
 *         description: Invalid pincode format
 *       401:
 *         description: Not authenticated
 */
router.get("/from-pincode", protect, pincodeRules, validate, addressController.getAddressFromPincode);

// @GET /api/users/addresses/from-coordinates?lat=30.90&lng=75.83
// Converts coordinates to address using Google Maps
router.get(
    "/from-coordinates",
    protect,
    coordinateRules,
    validate,
    addressController.getAddressFromCoordinates
);

// @POST /api/users/addresses
// Adds a new address for logged in user
// Body: { label, addressLine1, addressLine2?, city, state, pincode, latitude, longitude }
/**
 * @swagger
 * /api/users/addresses:
 *   post:
 *     summary: Add a new address
 *     tags: [Addresses]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddressRequest'
 *     responses:
 *       201:
 *         description: Address added successfully
 *       400:
 *         description: Invalid address details
 *       401:
 *         description: Not authenticated
 */
router.post("/", protect, addressRules, validate, addressController.addAddress);

// @GET /api/users/addresses
// Gets all saved addresses (default address first)
/**
 * @swagger
 * /api/users/addresses:
 *   get:
 *     summary: Get saved addresses
 *     tags: [Addresses]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Addresses fetched successfully
 *       401:
 *         description: Not authenticated
 */
router.get("/", protect, addressController.getAddresses);

// @PUT /api/users/addresses/:id
// Updates an existing address
/**
 * @swagger
 * /api/users/addresses/{id}:
 *   put:
 *     summary: Update address
 *     tags: [Addresses]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Address ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddressRequest'
 *     responses:
 *       200:
 *         description: Address updated successfully
 *       400:
 *         description: Invalid input details
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Address not found
 */
router.put("/:id", protect, addressRules, validate, addressController.updateAddress);

// @DELETE /api/users/addresses/:id
// Deletes an address (auto sets next as default if needed)
/**
 * @swagger
 * /api/users/addresses/{id}:
 *   delete:
 *     summary: Delete address
 *     tags: [Addresses]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Address ID
 *     responses:
 *       200:
 *         description: Address deleted successfully
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Address not found
 */
router.delete("/:id", protect, addressController.deleteAddress);

// @PATCH /api/users/addresses/:id/default
// Sets an address as the default delivery address
/**
 * @swagger
 * /api/users/addresses/{id}/default:
 *   patch:
 *     summary: Set address as default
 *     tags: [Addresses]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Address ID
 *     responses:
 *       200:
 *         description: Address set as default successfully
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Address not found
 */
router.patch("/:id/default", protect, addressController.setDefaultAddress);

export default router;