// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Two Mongoose schemas for the menu system:
// 1. MenuCategory — groups of items (Starters, Main Course, etc.)
// 2. FoodItem     — individual food items within a category

import mongoose from "mongoose";

// ─── MENU CATEGORY ────────────────────────────────────────────
const menuCategorySchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: [50, "Category name cannot exceed 50 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"],
    },

    // Display order in the menu (lower = shown first)
    sortOrder: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

menuCategorySchema.index({ restaurantId: 1, sortOrder: 1 });

// ─── FOOD ITEM ────────────────────────────────────────────────
const foodItemSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuCategory",
      required: true,
      index: true,
    },

    // ─── ITEM DETAILS ──────────────────────────────────────
    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [300, "Description cannot exceed 300 characters"],
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },

    // ─── IMAGE ─────────────────────────────────────────────
    image: {
      type: String, // Cloudinary URL
      default: null,
    },

    // ─── FLAGS ─────────────────────────────────────────────
    isVeg: {
      type: Boolean,
      required: [true, "Please specify veg or non-veg"],
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    isBestseller: {
      type: Boolean,
      default: false,
    },

    isSpicy: {
      type: Boolean,
      default: false,
    },

    // ─── PREP TIME ─────────────────────────────────────────
    preparationTime: {
      type: Number, // minutes
      default: 15,
    },

    // ─── CUSTOMIZATIONS ─────────────────────────────────────
    // Optional add-ons like extra cheese, sauce etc.
    // [{ name: "Extra Cheese", price: 20 }]
    customizations: [
      {
        name: { type: String, required: true },
        price: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

foodItemSchema.index({ restaurantId: 1, categoryId: 1 });
foodItemSchema.index({ restaurantId: 1, isAvailable: 1 });

export const MenuCategory = mongoose.model("MenuCategory", menuCategorySchema);
export const FoodItem = mongoose.model("FoodItem", foodItemSchema);