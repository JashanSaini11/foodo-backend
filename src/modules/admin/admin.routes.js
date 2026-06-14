// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// All admin API endpoints
// ALL routes require ADMIN role — no exceptions

import express from "express";
import * as adminController from "./admin.controller.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";
import {
  toggleStatusRules,
  verifyRules,
  changeRoleRules,
  validate,
} from "./admin.validation.js";

const router = express.Router();

// ─── ALL ADMIN ROUTES ARE PROTECTED ──────────────────────────
// Apply protect + authorize("ADMIN") to every route
const adminOnly = [protect, authorize("ADMIN")];

// ─── DASHBOARD ────────────────────────────────────────────────

// @GET /api/admin/stats
// Returns overview stats for admin dashboard
/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get admin dashboard stats
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Stats fetched successfully
 *       401:
 *         description: Not authenticated or not authorized
 */
router.get("/stats", ...adminOnly, adminController.getDashboardStats);

// ─── USER MANAGEMENT ──────────────────────────────────────────

// @GET /api/admin/users
// Get all users with filters
// Query: ?page=1&limit=20&role=USER&search=john
/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (admin)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Users list fetched successfully
 *       401:
 *         description: Not authenticated or not authorized
 */
router.get("/users", ...adminOnly, adminController.getAllUsers);

// @GET /api/admin/users/:id
// Get single user with order history
/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get user by ID (admin)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User fetched successfully
 *       401:
 *         description: Not authenticated or not authorized
 *       404:
 *         description: User not found
 */
router.get("/users/:id", ...adminOnly, adminController.getUserById);

// @PATCH /api/admin/users/:id/status
// Activate or deactivate user
// Body: { isActive: true/false }
/**
 * @swagger
 * /api/admin/users/{id}/status:
 *   patch:
 *     summary: Activate or deactivate a user
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User status updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated or not authorized
 */
router.patch(
  "/users/:id/status",
  ...adminOnly,
  toggleStatusRules,
  validate,
  adminController.toggleUserStatus
);

// @PATCH /api/admin/users/:id/role
// Change user role
// Body: { role: "USER" | "RESTAURANT_OWNER" | "DELIVERY_PARTNER" | "ADMIN" }
/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   patch:
 *     summary: Change user role
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [USER, RESTAURANT_OWNER, DELIVERY_PARTNER, ADMIN]
 *     responses:
 *       200:
 *         description: User role changed
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated or not authorized
 */
router.patch(
  "/users/:id/role",
  ...adminOnly,
  changeRoleRules,
  validate,
  adminController.changeUserRole
);

// ─── RESTAURANT MANAGEMENT ────────────────────────────────────

// @GET /api/admin/restaurants
// Get all restaurants with filters
// Query: ?page=1&isVerified=false&search=pizza
/**
 * @swagger
 * /api/admin/restaurants:
 *   get:
 *     summary: Get all restaurants (admin)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Restaurants list fetched
 *       401:
 *         description: Not authenticated or not authorized
 */
router.get("/restaurants", ...adminOnly, adminController.getAllRestaurants);

// @PATCH /api/admin/restaurants/:id/verify
// Verify or unverify a restaurant
// Body: { isVerified: true/false }
/**
 * @swagger
 * /api/admin/restaurants/{id}/verify:
 *   patch:
 *     summary: Verify or unverify a restaurant
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isVerified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Restaurant verification updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated or not authorized
 */
router.patch(
  "/restaurants/:id/verify",
  ...adminOnly,
  verifyRules,
  validate,
  adminController.verifyRestaurant
);

// @PATCH /api/admin/restaurants/:id/status
// Activate or deactivate a restaurant
// Body: { isActive: true/false }
/**
 * @swagger
 * /api/admin/restaurants/{id}/status:
 *   patch:
 *     summary: Activate or deactivate a restaurant
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Restaurant status updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated or not authorized
 */
router.patch(
  "/restaurants/:id/status",
  ...adminOnly,
  toggleStatusRules,
  validate,
  adminController.toggleRestaurantStatus
);

// ─── DELIVERY PARTNER MANAGEMENT ─────────────────────────────

// @GET /api/admin/delivery-partners
// Get all delivery partners
// Query: ?page=1&isVerified=false
/**
 * @swagger
 * /api/admin/delivery-partners:
 *   get:
 *     summary: Get all delivery partners (admin)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Delivery partners list fetched
 *       401:
 *         description: Not authenticated or not authorized
 */
router.get(
  "/delivery-partners",
  ...adminOnly,
  adminController.getAllDeliveryPartners
);

// @PATCH /api/admin/delivery-partners/:id/verify
// Verify or unverify a delivery partner
// Body: { isVerified: true/false }
/**
 * @swagger
 * /api/admin/delivery-partners/{id}/verify:
 *   patch:
 *     summary: Verify or unverify a delivery partner
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isVerified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Delivery partner verification updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated or not authorized
 */
router.patch(
  "/delivery-partners/:id/verify",
  ...adminOnly,
  verifyRules,
  validate,
  adminController.verifyDeliveryPartner
);

// ─── ORDER MANAGEMENT ─────────────────────────────────────────

// @GET /api/admin/orders
// Get all orders with filters
// Query: ?page=1&status=PENDING
/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     summary: Get all orders (admin)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Orders list fetched
 *       401:
 *         description: Not authenticated or not authorized
 */
router.get("/orders", ...adminOnly, adminController.getAllOrders);

export default router;