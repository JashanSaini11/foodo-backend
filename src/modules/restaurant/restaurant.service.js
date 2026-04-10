// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// All business logic for Restaurant management
// Phase 1: CRUD for restaurant profiles
// Phase 3: Nearby restaurants (own DB + Google Places merge)

import { Client } from "@googlemaps/google-maps-services-js";
import Restaurant from "./restaurant.model.js";
import { MenuCategory, FoodItem } from "./menu/menu.model.js";
import { deleteImage } from "../../config/cloudinary.js";
import { getCache, setCache, TTL } from "../../config/redis.js";

const googleMapsClient = new Client({});

// ─── CREATE RESTAURANT ────────────────────────────────────────
// Only RESTAURANT_OWNER role can call this
// One owner can have multiple restaurants
export const createRestaurant = async (ownerId, data) => {
  const restaurant = await Restaurant.create({
    ownerId,
    ...data,
    location: {
      type: "Point",
      coordinates: data.location.coordinates, // [longitude, latitude]
    },
  });

  return {
    message: "Restaurant created successfully. It will go live after admin verification.",
    restaurant,
  };
};

// ─── GET MY RESTAURANTS ───────────────────────────────────────
// Owner sees their own restaurants
export const getMyRestaurants = async (ownerId) => {
  const restaurants = await Restaurant.find({ ownerId }).sort({ createdAt: -1 });
  return restaurants;
};

// ─── GET RESTAURANT BY ID ─────────────────────────────────────
export const getRestaurantById = async (restaurantId) => {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    throw { statusCode: 404, message: "Restaurant not found." };
  }
  return restaurant;
};

// ─── UPDATE RESTAURANT ────────────────────────────────────────
// Only the owner of this restaurant can update
export const updateRestaurant = async (ownerId, restaurantId, data) => {
  const restaurant = await Restaurant.findOne({ _id: restaurantId, ownerId });
  if (!restaurant) {
    throw { statusCode: 404, message: "Restaurant not found or access denied." };
  }

  // Update coordinates if location is being changed
  if (data.location?.coordinates) {
    data.location = {
      type: "Point",
      coordinates: data.location.coordinates,
    };
  }

  const updated = await Restaurant.findByIdAndUpdate(
    restaurantId,
    { $set: data },
    { new: true, runValidators: true }
  );

  return {
    message: "Restaurant updated successfully.",
    restaurant: updated,
  };
};

// ─── UPDATE COVER IMAGE ───────────────────────────────────────
// Called after Cloudinary upload (multer middleware runs first in controller)
export const updateCoverImage = async (ownerId, restaurantId, file) => {
  if (!file) {
    throw { statusCode: 400, message: "No image file provided." };
  }

  const restaurant = await Restaurant.findOne({ _id: restaurantId, ownerId });
  if (!restaurant) {
    throw { statusCode: 404, message: "Restaurant not found or access denied." };
  }

  // Delete old image from Cloudinary if exists
  if (restaurant.coverImage) {
    // Extract public_id from URL: foodo/restaurants/restaurant_<id>
    const publicId = `foodo/restaurants/restaurant_${restaurantId}`;
    await deleteImage(publicId);
  }

  restaurant.coverImage = file.path; // Cloudinary URL
  await restaurant.save();

  return {
    message: "Cover image updated successfully.",
    coverImage: restaurant.coverImage,
  };
};

// ─── TOGGLE OPEN / CLOSED ─────────────────────────────────────
// Owner can manually flip the restaurant open/closed anytime
export const toggleOpenStatus = async (ownerId, restaurantId, isOpen) => {
  const restaurant = await Restaurant.findOneAndUpdate(
    { _id: restaurantId, ownerId },
    { isOpen },
    { new: true }
  );

  if (!restaurant) {
    throw { statusCode: 404, message: "Restaurant not found or access denied." };
  }

  return {
    message: `Restaurant is now ${isOpen ? "open" : "closed"}.`,
    isOpen: restaurant.isOpen,
  };
};

// ─── DELETE RESTAURANT ────────────────────────────────────────
// Also cleans up all menu categories and food items
export const deleteRestaurant = async (ownerId, restaurantId) => {
  const restaurant = await Restaurant.findOne({ _id: restaurantId, ownerId });
  if (!restaurant) {
    throw { statusCode: 404, message: "Restaurant not found or access denied." };
  }

  // Cascade delete menu data
  await FoodItem.deleteMany({ restaurantId });
  await MenuCategory.deleteMany({ restaurantId });
  await Restaurant.findByIdAndDelete(restaurantId);

  return { message: "Restaurant deleted successfully." };
};

// ─── GET NEARBY RESTAURANTS (Phase 3) ────────────────────────
// Combines our own restaurant data + Google Places nearby restaurants
// Cached in Redis for 6 hours to save API calls
export const getNearbyRestaurants = async ({ latitude, longitude, radius = 5 }) => {
  const cacheKey = `nearby:${latitude.toFixed(4)}:${longitude.toFixed(4)}:${radius}`;

  // Check Redis cache first
  const cached = await getCache(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  // ─── Query 1: Our own verified restaurants ────────────────
  const radiusInMeters = radius * 1000;

  const ownRestaurants = await Restaurant.find({
    isActive: true,
    isVerified: true,
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [longitude, latitude] },
        $maxDistance: radiusInMeters,
      },
    },
  }).select("name cuisineTypes coverImage address location rating avgDeliveryTime deliveryFee isOpen minOrderAmount");

  // Format our restaurants to a unified shape
  const formattedOwnRestaurants = ownRestaurants.map((r) => ({
    id: r._id,
    name: r.name,    
    cuisineTypes: r.cuisineTypes,
    image: r.coverImage,
    rating: r.rating,
    avgDeliveryTime: r.avgDeliveryTime,
    deliveryFee: r.deliveryFee,
    minOrderAmount: r.minOrderAmount,
    isOpen: r.isOpen,
    address: r.address.city,
    source: "own", // helps frontend differentiate
  }));

  // ─── Query 2: Google Places nearby restaurants ─────────────
  let googleRestaurants = [];
  try {
    const response = await googleMapsClient.placesNearby({
      params: {
        location: { lat: latitude, lng: longitude },
        radius: radiusInMeters,
        type: "restaurant",
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    });

    // Filter out restaurants that are already in our DB (by googlePlaceId)
    const ownGoogleIds = new Set(
      (await Restaurant.find({ isVerified: true }).select("googlePlaceId").lean())
        .map((r) => r.googlePlaceId)
        .filter(Boolean)
    );

    googleRestaurants = response.data.results
      .filter((place) => !ownGoogleIds.has(place.place_id))
      .map((place) => ({
        id: place.place_id,
        name: place.name,
        cuisineTypes: ["Restaurant"], // Google doesn't give cuisines in nearby
        image: place.photos?.[0]
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${place.photos[0].photo_reference}&key=${process.env.GOOGLE_MAPS_API_KEY}`
          : null,
        rating: place.rating || 0,
        avgDeliveryTime: null, // not available from Google
        deliveryFee: null,
        minOrderAmount: null,
        isOpen: place.opening_hours?.open_now ?? null,
        address: place.vicinity,
        source: "google",
      }));
  } catch (err) {
    // If Google API fails, just return our own restaurants (don't crash)
    console.warn("Google Places API error:", err.message);
  }

  const result = {
    count: formattedOwnRestaurants.length + googleRestaurants.length,
    ownRestaurants: formattedOwnRestaurants,
    googleRestaurants,
  };

  // Cache for 6 hours
  await setCache(cacheKey, result, TTL.RESTAURANT_LIST);

  return result;
};

// ─── GET PUBLIC RESTAURANT DETAILS ────────────────────────────
// Used by the user-facing menu page
// Returns restaurant info + full menu grouped by category
export const getRestaurantWithMenu = async (restaurantId) => {
  const cacheKey = `restaurant_menu:${restaurantId}`;

  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const restaurant = await Restaurant.findOne({
    _id: restaurantId,
    isActive: true,
    isVerified: true,
  });

  if (!restaurant) {
    throw { statusCode: 404, message: "Restaurant not found." };
  }

  // Get all categories for this restaurant
  const categories = await MenuCategory.find({
    restaurantId,
    isActive: true,
  }).sort({ sortOrder: 1 });

  // Get all available food items, grouped by category
  const items = await FoodItem.find({
    restaurantId,
    isAvailable: true,
  });

  // Build menu: each category with its items
  const menu = categories.map((cat) => ({
    categoryId: cat._id,
    categoryName: cat.name,
    description: cat.description,
    items: items.filter(
      (item) => item.categoryId.toString() === cat._id.toString()
    ),
  }));

  const result = { restaurant, menu };

  // Cache for 30 minutes
  await setCache(cacheKey, result, 30 * 60);

  return result;
};