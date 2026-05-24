// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// All cart business logic
// Cart is stored in Redis — fast, temporary, auto-expires
// One user can only have ONE active cart at a time
// Adding items from different restaurant → clears old cart first

import { getCache, setCache, deleteCache, TTL } from "../../../config/redis.js";
import { FoodItem } from "../../restaurant/menu/menu.model.js";
import Restaurant from "../../restaurant/restaurant.model.js";

// ─── HELPER: Get cart key for user ────────────────────────────
const cartKey = (userId) => `cart:${userId}`;

// ─── HELPER: Calculate cart totals ────────────────────────────
const calculateTotals = (items, deliveryFee) => {
    const subtotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );
    return {
        subtotal,
        deliveryFee,
        totalAmount: subtotal + deliveryFee,
    };
};

// ─── ADD ITEM TO CART ─────────────────────────────────────────
// If cart has items from different restaurant → clear and start fresh
// This is same behaviour as Swiggy/Zomato
export const addToCart = async (userId, { itemId, quantity = 1, customizations = [] }) => {
    // Get the food item from MongoDB
    const item = await FoodItem.findById(itemId);
    if (!item) {
        throw { statusCode: 404, message: "Food item not found." };
    }
    if (!item.isAvailable) {
        throw { statusCode: 400, message: "This item is currently unavailable." };
    }

    // Get restaurant details
    const restaurant = await Restaurant.findById(item.restaurantId).select(
        "name deliveryFee minOrderAmount isOpen"
    );
    if (!restaurant) {
        throw { statusCode: 404, message: "Restaurant not found." };
    }
    if (!restaurant.isOpen) {
        throw { statusCode: 400, message: "This restaurant is currently closed." };
    }
 
    // Get existing cart
    let cart = await getCache(cartKey(userId));

    // ─── Different restaurant check ───────────────────────────
    // If cart has items from a different restaurant → clear it
    if (cart && cart.restaurantId !== item.restaurantId.toString()) {
        cart = null; // will create fresh cart below
    }

    // ─── Create new cart or update existing ───────────────────
    if (!cart) {
        cart = {
            restaurantId: item.restaurantId.toString(),
            restaurantName: restaurant.name,
            deliveryFee: restaurant.deliveryFee,
            minOrderAmount: restaurant.minOrderAmount,
            items: [],  
        };
    }

    // Check if item already exists in cart → update quantity
    const existingItemIndex = cart.items.findIndex(
        (i) => i.itemId === itemId
    );

    if (existingItemIndex > -1) {
        // Item exists → update quantity
        cart.items[existingItemIndex].quantity += quantity;
        cart.items[existingItemIndex].customizations = customizations;
    } else {
        // New item → add to cart
        cart.items.push({
            itemId: item._id.toString(),
            name: item.name,
            price: item.price,
            quantity,
            isVeg: item.isVeg,
            image: item.image,
            customizations,
        });
    }

    // Recalculate totals
    const totals = calculateTotals(cart.items, cart.deliveryFee);
    cart = { ...cart, ...totals };

    // Save to Redis with 30 min TTL
    await setCache(cartKey(userId), cart, TTL.CART);

    return {
        message: "Item added to cart.",
        cart,
    };
};

// ─── GET CART ─────────────────────────────────────────────────
export const getCart = async (userId) => {
    const cart = await getCache(cartKey(userId));
    if (!cart || cart.items.length === 0) {
        return { isEmpty: true, cart: null };
    }
    return { isEmpty: false, cart };
};

// ─── UPDATE ITEM QUANTITY ─────────────────────────────────────
// quantity = 0 → removes item from cart
export const updateCartItem = async (userId, itemId, quantity) => {
    const cart = await getCache(cartKey(userId));
    if (!cart) {
        throw { statusCode: 404, message: "Cart is empty." };
    }

    const itemIndex = cart.items.findIndex((i) => i.itemId === itemId);
    if (itemIndex === -1) {
        throw { statusCode: 404, message: "Item not found in cart." };
    }

    if (quantity <= 0) {
        // Remove item from cart
        cart.items.splice(itemIndex, 1);
    } else {
        // Update quantity
        cart.items[itemIndex].quantity = quantity;
    }

    // If cart is now empty → delete it
    if (cart.items.length === 0) {
        await deleteCache(cartKey(userId));
        return { message: "Cart is now empty.", cart: null };
    }

    // Recalculate totals
    const totals = calculateTotals(cart.items, cart.deliveryFee);
    const updatedCart = { ...cart, ...totals };

    await setCache(cartKey(userId), updatedCart, TTL.CART);

    return { message: "Cart updated.", cart: updatedCart };
};

// ─── REMOVE ITEM FROM CART ────────────────────────────────────
export const removeFromCart = async (userId, itemId) => {
    return updateCartItem(userId, itemId, 0);
};

// ─── CLEAR CART ───────────────────────────────────────────────
// Called after order is placed successfully
export const clearCart = async (userId) => {
    await deleteCache(cartKey(userId));
    return { message: "Cart cleared." };
};