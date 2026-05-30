// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// All delivery partner API endpoints
// Registration is open to any logged in user
// All other routes require DELIVERY_PARTNER role

import express from "express";
import * as deliveryController from "./delivery.controller.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";
import {
  registerRules,
  updateProfileRules,
  availabilityRules,
  locationRules,
  validate,
} from "./delivery.validation.js";

const router = express.Router();

// ─── REGISTRATION ─────────────────────────────────────────────
// Any logged in user can register as delivery partner
// Role changes to DELIVERY_PARTNER after registration

/**
 * @swagger
 * /api/delivery/register:
 *   post:
 *     summary: Register as a delivery partner
 *     tags: [Delivery]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vehicleType, vehicleNumber]
 *             properties:
 *               vehicleType:
 *                 type: string
 *               vehicleNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Registered successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 */
router.post(
  "/register",
  protect,
  registerRules,
  validate,
  deliveryController.registerPartner
);

// ─── PARTNER ONLY ROUTES ──────────────────────────────────────
// All routes below require DELIVERY_PARTNER role

/**
 * @swagger
 * /api/delivery/profile:
 *   get:
 *     summary: Get partner profile with stats
 *     tags: [Delivery]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Profile fetched successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied
 */
router.get(
  "/profile",
  protect,
  authorize("DELIVERY_PARTNER", "ADMIN"),
  deliveryController.getPartnerProfile
);

/**
 * @swagger
 * /api/delivery/profile:
 *   put:
 *     summary: Update delivery partner vehicle info
 *     tags: [Delivery]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vehicleType:
 *                 type: string
 *               vehicleNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied
 */
router.put(
  "/profile",
  protect,
  authorize("DELIVERY_PARTNER", "ADMIN"),
  updateProfileRules,
  validate,
  deliveryController.updatePartnerProfile
);

/**
 * @swagger
 * /api/delivery/availability:
 *   patch:
 *     summary: Toggle delivery partner availability
 *     tags: [Delivery]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isAvailable]
 *             properties:
 *               isAvailable:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Availability toggled successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied
 */
router.patch(
  "/availability",
  protect,
  authorize("DELIVERY_PARTNER", "ADMIN"),
  availabilityRules,
  validate,
  deliveryController.toggleAvailability
);

/**
 * @swagger
 * /api/delivery/location:
 *   patch:
 *     summary: Update delivery partner current location
 *     tags: [Delivery]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [latitude, longitude]
 *             properties:
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *     responses:
 *       200:
 *         description: Location updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied
 */
router.patch(
  "/location",
  protect,
  authorize("DELIVERY_PARTNER", "ADMIN"),
  locationRules,
  validate,
  deliveryController.updateLocation
);

// ─── SPECIFIC ROUTES BEFORE DYNAMIC ───────────────────────────

/**
 * @swagger
 * /api/delivery/requests:
 *   get:
 *     summary: Get available delivery requests nearby
 *     tags: [Delivery]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Delivery requests fetched successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied
 */
router.get(
  "/requests",
  protect,
  authorize("DELIVERY_PARTNER", "ADMIN"),
  deliveryController.getDeliveryRequests
);

/**
 * @swagger
 * /api/delivery/active:
 *   get:
 *     summary: Get current active delivery
 *     tags: [Delivery]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Active delivery fetched successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied
 */
router.get(
  "/active",
  protect,
  authorize("DELIVERY_PARTNER", "ADMIN"),
  deliveryController.getActiveDelivery
);

/**
 * @swagger
 * /api/delivery/history:
 *   get:
 *     summary: Get past deliveries and earnings
 *     tags: [Delivery]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Delivery history retrieved successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied
 */
router.get(
  "/history",
  protect,
  authorize("DELIVERY_PARTNER", "ADMIN"),
  deliveryController.getDeliveryHistory
);

// ─── DYNAMIC ORDER ROUTES ─────────────────────────────────────

/**
 * @swagger
 * /api/delivery/requests/{orderId}/accept:
 *   post:
 *     summary: Accept a delivery request
 *     tags: [Delivery]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Delivery accepted successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied
 *       404:
 *         description: Order not found
 */
router.post(
  "/requests/:orderId/accept",
  protect,
  authorize("DELIVERY_PARTNER", "ADMIN"),
  deliveryController.acceptDelivery
);

/**
 * @swagger
 * /api/delivery/requests/{orderId}/reject:
 *   post:
 *     summary: Reject a delivery request
 *     tags: [Delivery]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Delivery rejected successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied
 *       404:
 *         description: Order not found
 */
router.post(
  "/requests/:orderId/reject",
  protect,
  authorize("DELIVERY_PARTNER", "ADMIN"),
  deliveryController.rejectDelivery
);

export default router;