// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// HTTP layer for restaurant management
// Thin controller — reads request, calls service, sends response

import * as restaurantService from "./restaurant.service.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import {
  uploadRestaurantImage,
  handleUpload,
} from "../../middlewares/upload.middleware.js";

// ─── CREATE RESTAURANT ────────────────────────────────────────
// POST /api/restaurants
export const createRestaurant = async (req, res) => {
  try {
    const result = await restaurantService.createRestaurant(req.user.id, req.body);
    return successResponse(res, {
      statusCode: 201,
      message: result.message,
      data: { restaurant: result.restaurant },
    });
  } catch (err) {
    return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
  }
};

// ─── GET MY RESTAURANTS ───────────────────────────────────────
// GET /api/restaurants/my
export const getMyRestaurants = async (req, res) => {
  try {
    const restaurants = await restaurantService.getMyRestaurants(req.user.id);
    return successResponse(res, {
      statusCode: 200,
      message: "Restaurants fetched successfully.",
      data: { count: restaurants.length, restaurants },
    });
  } catch (err) {
    return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
  }
};

// ─── GET SINGLE RESTAURANT ────────────────────────────────────
// GET /api/restaurants/:id
export const getRestaurant = async (req, res) => {
  try {
    const restaurant = await restaurantService.getRestaurantById(req.params.id);
    return successResponse(res, {
      statusCode: 200,
      message: "Restaurant fetched successfully.",
      data: { restaurant },
    });
  } catch (err) {
    return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
  }
};

// ─── UPDATE RESTAURANT ────────────────────────────────────────
// PUT /api/restaurants/:id
export const updateRestaurant = async (req, res) => {
  try {
    const result = await restaurantService.updateRestaurant(
      req.user.id,
      req.params.id,
      req.body
    );
    return successResponse(res, {
      statusCode: 200,
      message: result.message,
      data: { restaurant: result.restaurant },
    });
  } catch (err) {
    return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
  }
};

// ─── UPDATE COVER IMAGE ───────────────────────────────────────
// POST /api/restaurants/:id/cover-image
export const updateCoverImage = async (req, res) => {
  try {
    await handleUpload(uploadRestaurantImage, req, res);
    const result = await restaurantService.updateCoverImage(
      req.user.id,
      req.params.id,
      req.file
    );
    return successResponse(res, {
      statusCode: 200,
      message: result.message,
      data: { coverImage: result.coverImage },
    });
  } catch (err) {
    return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
  }
};

// ─── TOGGLE OPEN / CLOSED ─────────────────────────────────────
// PATCH /api/restaurants/:id/status
export const toggleOpenStatus = async (req, res) => {
  try {
    const result = await restaurantService.toggleOpenStatus(
      req.user.id,
      req.params.id,
      req.body.isOpen
    );
    return successResponse(res, {
      statusCode: 200,
      message: result.message,
      data: { isOpen: result.isOpen },
    });
  } catch (err) {
    return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
  }
};

// ─── DELETE RESTAURANT ────────────────────────────────────────
// DELETE /api/restaurants/:id
export const deleteRestaurant = async (req, res) => {
  try {
    const result = await restaurantService.deleteRestaurant(req.user.id, req.params.id);
    return successResponse(res, { statusCode: 200, message: result.message });
  } catch (err) {
    return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
  }
};

// ─── GET NEARBY RESTAURANTS ───────────────────────────────────
// GET /api/restaurants/nearby?latitude=30.7&longitude=76.7&radius=5
export const getNearbyRestaurants = async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.query;
    const result = await restaurantService.getNearbyRestaurants({
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius: radius ? parseFloat(radius) : 5,
    });
    return successResponse(res, {
      statusCode: 200,
      message: "Nearby restaurants fetched.",
      data: result,
    });
  } catch (err) {
    return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
  }
};

// ─── GET RESTAURANT + MENU (public) ──────────────────────────
// GET /api/restaurants/:id/menu
export const getRestaurantWithMenu = async (req, res) => {
  try {
    const result = await restaurantService.getRestaurantWithMenu(req.params.id);
    return successResponse(res, {
      statusCode: 200,
      message: "Restaurant menu fetched.",
      data: result,
    });
  } catch (err) {
    return errorResponse(res, { statusCode: err.statusCode || 500, message: err.message });
  }
};