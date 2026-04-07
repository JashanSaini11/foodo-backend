// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Connects to Cloudinary using credentials from .env
// Exports configured cloudinary instance used for image uploads
// Also exports folder constants so we don't hardcode folder names

import { v2 as cloudinary } from "cloudinary";

// ─── CONFIGURE CLOUDINARY ─────────────────────────────────────
// This must run before any upload is attempted
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── CLOUDINARY FOLDER STRUCTURE ─────────────────────────────
// All images are organized into folders on Cloudinary
// Keeps your media library clean and easy to manage
export const FOLDERS = {
  AVATARS: "foodo/avatars", // user profile photos
  RESTAURANTS: "foodo/restaurants", // restaurant cover images
  FOOD_ITEMS: "foodo/food_items", // food item images
};

// ─── HELPER: Delete image from Cloudinary ─────────────────────
// Called when user uploads new avatar → old one gets deleted
export const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    console.log(`🗑️  Deleted image: ${publicId}`);
  } catch (error) {
    console.error("Failed to delete image from Cloudinary:", error.message);
  }
};

export default cloudinary;
