// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// All business logic for the User module
// Handles: get profile, update profile, update avatar

import { prisma } from "../../config/db.js";
import { deleteImage, FOLDERS } from "../../config/cloudinary.js";

// ─── GET PROFILE ──────────────────────────────────────────────
// Fetches full user profile from PostgreSQL
// select: only return safe fields — never return password
export const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
      provider: true,
      isVerified: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw { statusCode: 404, message: "User not found." };
  }

  return user;
};

// ─── UPDATE PROFILE ───────────────────────────────────────────
// Updates name and/or phone number
// Email is NOT updatable here (security — needs separate verification flow)
export const updateProfile = async (userId, { name, phone }) => {
  // If phone is being updated, check it's not already taken by another user
  if (phone) {
    const existingUser = await prisma.user.findFirst({
      where: {
        phone,
        NOT: { id: userId }, // exclude current user from check
      },
    });
    if (existingUser) {
      throw {
        statusCode: 409,
        message: "This phone number is already in use.",
      };
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      // Only update fields that were actually sent
      ...(name && { name }),
      ...(phone && { phone }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
    },
  });

  return updatedUser;
};

// ─── UPDATE AVATAR ────────────────────────────────────────────
// Called after multer + Cloudinary upload is complete
// req.file.path = the Cloudinary URL of the uploaded image
// req.file.filename = the public_id used to delete old image
export const updateAvatar = async (userId, file) => {
  if (!file) {
    throw { statusCode: 400, message: "No image file provided." };
  }

  // Old avatar public_id would be "foodo/avatars/user_<userId>"
  // Since we use same public_id on upload, Cloudinary overwrites it automatically
  // But if user had no avatar before, no deletion needed
  const oldUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatar: true },
  });

  // Update avatar URL in database
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { avatar: file.path }, // file.path = full Cloudinary URL
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
    },
  });

  return {
    message: "Profile photo updated successfully.",
    user: updatedUser,
  };
};
