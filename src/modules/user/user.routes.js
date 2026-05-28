// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Defines all User module API endpoints
// All routes are protected — user must be logged in

import express from "express";
import * as userController from "./user.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";
import { updateProfileRules, validate } from "./user.validation.js";

const router = express.Router();

// ─── ALL ROUTES REQUIRE LOGIN ─────────────────────────────────
// protect() checks the accessToken cookie on every request
// If not logged in → 401 response

// @GET  /api/users/profile
// Returns full profile of logged in user
/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Profile fetched successfully
 *       401:
 *         description: Not authenticated
 */
router.get("/profile", protect, userController.getProfile);

// @PUT  /api/users/profile
// Updates name and/or phone
// Body: { name?, phone? }
/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid input details
 *       401:
 *         description: Not authenticated
 */
router.put(
  "/profile",
  protect,
  updateProfileRules,
  validate,
  userController.updateProfile,
);

// @POST /api/users/profile/avatar
// Uploads profile photo to Cloudinary
// Form data: avatar (image file, max 2MB)
/**
 * @swagger
 * /api/users/profile/avatar:
 *   post:
 *     summary: Upload profile avatar
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload (max 2MB)
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 *       400:
 *         description: No file uploaded or invalid file format
 *       401:
 *         description: Not authenticated
 */
router.post("/profile/avatar", protect, userController.updateAvatar);

export default router;
