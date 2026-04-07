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
router.get("/profile", protect, userController.getProfile);

// @PUT  /api/users/profile
// Updates name and/or phone
// Body: { name?, phone? }
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
router.post("/profile/avatar", protect, userController.updateAvatar);

export default router;
