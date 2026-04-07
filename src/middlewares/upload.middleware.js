// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Handles file uploads using Multer + Cloudinary
// Multer reads the file from the request
// CloudinaryStorage sends it directly to Cloudinary
// No file is saved locally on your server

import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary, { FOLDERS } from "../config/cloudinary.js";

// ─── ALLOWED FILE TYPES ───────────────────────────────────────
const ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp"];

// ─── AVATAR STORAGE ───────────────────────────────────────────
// Where and how to store user profile photos on Cloudinary
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: (req) => ({
    folder: FOLDERS.AVATARS, // foodo/avatars/
    allowed_formats: ALLOWED_FORMATS,
    transformation: [
      { width: 400, height: 400, crop: "fill" }, // auto crop to square
      { quality: "auto" }, // auto compress
    ],
    // Unique filename using userId so it overwrites old avatar
    public_id: `user_${req.user.id}`,
  }),
});

// ─── RESTAURANT IMAGE STORAGE ────────────────────────────────
const restaurantStorage = new CloudinaryStorage({
  cloudinary,
  params: (req) => ({
    folder: FOLDERS.RESTAURANTS,
    allowed_formats: ALLOWED_FORMATS,
    transformation: [
      { width: 1200, height: 600, crop: "fill" },
      { quality: "auto" },
    ],
    public_id: `restaurant_${req.params.id || Date.now()}`,
  }),
});

// ─── FILE FILTER ──────────────────────────────────────────────
// Rejects files that are not images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true); // accept file
  } else {
    cb(new Error("Only image files are allowed (jpg, jpeg, png, webp)"), false);
  }
};

// ─── MULTER INSTANCES ─────────────────────────────────────────

// For user avatar uploads (max 2MB)
export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
}).single("avatar"); // "avatar" = form field name

// For restaurant image uploads (max 5MB)
export const uploadRestaurantImage = multer({
  storage: restaurantStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
}).single("image");

// ─── UPLOAD ERROR HANDLER ─────────────────────────────────────
// Wraps multer upload in a promise to handle errors cleanly
// Usage: await handleUpload(uploadAvatar, req, res)
export const handleUpload = (uploadFn, req, res) => {
  return new Promise((resolve, reject) => {
    uploadFn(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // Multer specific errors (file too large etc.)
        reject({ statusCode: 400, message: err.message });
      } else if (err) {
        // Other errors (wrong file type etc.)
        reject({ statusCode: 400, message: err.message });
      } else {
        resolve(); // upload successful
      }
    });
  });
};
