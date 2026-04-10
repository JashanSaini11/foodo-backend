// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// HTTP layer for menu management
// Handles both category and food item endpoints

import * as menuService from "./menu.service.js";
import { successResponse, errorResponse } from "../../../utils/response.js";
import { handleUpload } from "../../../middlewares/upload.middleware.js";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary, { FOLDERS } from "../../../config/cloudinary.js";

// ─── FOOD ITEM IMAGE UPLOAD ───────────────────────────────────
// Separate multer instance for food item images (stored in foodo/food_items/)
const foodItemStorage = new CloudinaryStorage({
  cloudinary,
  params: (req) => ({
    folder: FOLDERS.FOOD_ITEMS,
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 600, height: 600, crop: "fill" },
      { quality: "auto" },
    ],
    public_id: `item_${req.params.itemId}`,
  }),
});

const uploadFoodItemImage = multer({
  storage: foodItemStorage,
  fileFilter: (req, file, cb) => {
    file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Images only"), false);
  },
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
}).single("image");

// ══════════════════════════════════════════════════════════════
// CATEGORY CONTROLLERS
// ══════════════════════════════════════════════════════════════

// POST /api/restaurants/:restaurantId/menu/categories
export const createCategory = async (req, res) => {
  try {
    const result = await menuService.createCategory(
      req.user.id,
      req.params.restaurantId,
      req.body
    );
    return successResponse(res, { statusCode: 201, message: result.message, data: { category: result.category } });
  } catch (err) {
    return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
  }
};

// GET /api/restaurants/:restaurantId/menu/categories
export const getCategories = async (req, res) => {
  try {
    const categories = await menuService.getCategories(req.params.restaurantId);
    return successResponse(res, {
      statusCode: 200,
      message: "Categories fetched successfully.",
      data: { count: categories.length, categories },
    });
  } catch (err) {
    return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
  }
};

// PUT /api/restaurants/:restaurantId/menu/categories/:categoryId
export const updateCategory = async (req, res) => {
  try {
    const result = await menuService.updateCategory(
      req.user.id,
      req.params.restaurantId,
      req.params.categoryId,
      req.body
    );
    return successResponse(res, { statusCode: 200, message: result.message, data: { category: result.category } });
  } catch (err) {
    return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
  }
};

// DELETE /api/restaurants/:restaurantId/menu/categories/:categoryId
export const deleteCategory = async (req, res) => {
  try {
    const result = await menuService.deleteCategory(
      req.user.id,
      req.params.restaurantId,
      req.params.categoryId
    );
    return successResponse(res, { statusCode: 200, message: result.message });
  } catch (err) {
    return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
  }
};

// ══════════════════════════════════════════════════════════════
// FOOD ITEM CONTROLLERS
// ══════════════════════════════════════════════════════════════

// POST /api/restaurants/:restaurantId/menu/items
export const addFoodItem = async (req, res) => {
  try {
    const result = await menuService.addFoodItem(
      req.user.id,
      req.params.restaurantId,
      req.body
    );
    return successResponse(res, { statusCode: 201, message: result.message, data: { item: result.item } });
  } catch (err) {
    return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
  }
};

// GET /api/restaurants/:restaurantId/menu/items
export const getFoodItems = async (req, res) => {
  try {
    const items = await menuService.getFoodItems(req.params.restaurantId);
    return successResponse(res, {
      statusCode: 200,
      message: "Food items fetched successfully.",
      data: { count: items.length, items },
    });
  } catch (err) {
    return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
  }
};

// PUT /api/restaurants/:restaurantId/menu/items/:itemId
export const updateFoodItem = async (req, res) => {
  try {
    const result = await menuService.updateFoodItem(
      req.user.id,
      req.params.restaurantId,
      req.params.itemId,
      req.body
    );
    return successResponse(res, { statusCode: 200, message: result.message, data: { item: result.item } });
  } catch (err) {
    return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
  }
};

// POST /api/restaurants/:restaurantId/menu/items/:itemId/image
export const updateFoodItemImage = async (req, res) => {
  try {
    await handleUpload(uploadFoodItemImage, req, res);
    const result = await menuService.updateFoodItemImage(
      req.user.id,
      req.params.restaurantId,
      req.params.itemId,
      req.file
    );
    return successResponse(res, { statusCode: 200, message: result.message, data: { image: result.image } });
  } catch (err) {
    return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
  }
};

// PATCH /api/restaurants/:restaurantId/menu/items/:itemId/availability
export const toggleItemAvailability = async (req, res) => {
  try {
    const result = await menuService.toggleItemAvailability(
      req.user.id,
      req.params.restaurantId,
      req.params.itemId,
      req.body.isAvailable
    );
    return successResponse(res, { statusCode: 200, message: result.message, data: { isAvailable: result.isAvailable } });
  } catch (err) {
    return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
  }
};

// DELETE /api/restaurants/:restaurantId/menu/items/:itemId
export const deleteFoodItem = async (req, res) => {
  try {
    const result = await menuService.deleteFoodItem(
      req.user.id,
      req.params.restaurantId,
      req.params.itemId
    );
    return successResponse(res, { statusCode: 200, message: result.message });
  } catch (err) {
    return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
  }
};