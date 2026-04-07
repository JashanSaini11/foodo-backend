// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Handles HTTP requests for the User module
// Calls service functions and sends back responses

import * as userService from "./user.service.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import {
  uploadAvatar,
  handleUpload,
} from "../../middlewares/upload.middleware.js";

// ───────── GET PROFILE ─────────────────────────────────
// GET /api/users/profile
// req.user is already set by protect() middleware
export const getProfile = async (req, res) => {
  try {
    const user = await userService.getProfile(req.user.id);
    return successResponse(res, {
      statusCode: 200,
      message: "Profile fetched successfully.",
      data: { user },
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      message: err.message,
    });
  }
};

// ──────────── UPDATE PROFILE ──────────────────────────────────
// PUT /api/users/profile
// Body: { name?, phone? }
export const updateProfile = async (req, res) => {
  try {
    const user = await userService.updateProfile(req.user.id, req.body);
    return successResponse(res, {
      statusCode: 200,
      message: "Profile updated successfully.",
      data: { user },
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      message: err.message,
    });
  }
};

// ───────── UPDATE AVATAR ─────────────────────────────────────
// POST /api/users/profile/avatar
// Form data: avatar (image file)
// Flow: multer reads file → sends to Cloudinary → saves URL to DB
export const updateAvatar = async (req, res) => {
  try {
    // Run multer upload first (sends file to Cloudinary)
    await handleUpload(uploadAvatar, req, res);

    // req.file is now populated by multer with Cloudinary response
    const result = await userService.updateAvatar(req.user.id, req.file);

    return successResponse(res, {
      statusCode: 200,
      message: result.message,
      data: { user: result.user },
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: err.statusCode || 500,
      message: err.message,
    });
  }
};
