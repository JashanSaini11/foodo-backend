import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── In-memory Redis ──────────────────────────────────────────
const store = new Map();
vi.mock("../../src/config/redis.js", () => ({
  setCache: vi.fn(async (k, v) => store.set(k, v)),
  getCache: vi.fn(async (k) => (store.has(k) ? store.get(k) : null)),
  deleteCache: vi.fn(async (k) => store.delete(k)),
  TTL: { CART: 1800 },
}));

// ─── Mongoose models ──────────────────────────────────────────
const foodItem = {
  _id: "item-1",
  name: "Paneer Tikka",
  price: 200,
  isVeg: true,
  image: null,
  isAvailable: true,
  restaurantId: { toString: () => "rest-1" },
};
vi.mock("../../src/modules/restaurant/menu/menu.model.js", () => ({
  FoodItem: { findById: vi.fn() },
}));
vi.mock("../../src/modules/restaurant/restaurant.model.js", () => ({
  default: { findById: vi.fn() },
}));

import { FoodItem } from "../../src/modules/restaurant/menu/menu.model.js";
import Restaurant from "../../src/modules/restaurant/restaurant.model.js";
import {
  addToCart,
  getCart,
  updateCartItem,
} from "../../src/modules/order/cart/cart.service.js";

const restaurant = {
  name: "Test Diner",
  deliveryFee: 30,
  minOrderAmount: 100,
  isOpen: true,
};

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
  FoodItem.findById.mockResolvedValue({ ...foodItem });
  Restaurant.findById.mockReturnValue({
    select: vi.fn().mockResolvedValue({ ...restaurant }),
  });
});

describe("cart.addToCart", () => {
  it("creates a cart and computes totals (subtotal + delivery fee)", async () => {
    const { cart } = await addToCart("u1", { itemId: "item-1", quantity: 2 });
    expect(cart.items).toHaveLength(1);
    expect(cart.subtotal).toBe(400);
    expect(cart.deliveryFee).toBe(30);
    expect(cart.totalAmount).toBe(430);
  });

  it("increments quantity when the same item is added again", async () => {
    await addToCart("u1", { itemId: "item-1", quantity: 1 });
    const { cart } = await addToCart("u1", { itemId: "item-1", quantity: 2 });
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(3);
    expect(cart.subtotal).toBe(600);
  });

  it("rejects an unavailable item", async () => {
    FoodItem.findById.mockResolvedValue({ ...foodItem, isAvailable: false });
    await expect(addToCart("u1", { itemId: "item-1" })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("rejects when the restaurant is closed", async () => {
    Restaurant.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue({ ...restaurant, isOpen: false }),
    });
    await expect(addToCart("u1", { itemId: "item-1" })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("clears the cart when adding from a different restaurant", async () => {
    await addToCart("u1", { itemId: "item-1", quantity: 1 });
    // Next item belongs to a different restaurant
    FoodItem.findById.mockResolvedValue({
      ...foodItem,
      _id: "item-2",
      name: "Burger",
      price: 150,
      restaurantId: { toString: () => "rest-2" },
    });
    Restaurant.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue({ ...restaurant, name: "Other Diner" }),
    });
    const { cart } = await addToCart("u1", { itemId: "item-2", quantity: 1 });
    expect(cart.restaurantId).toBe("rest-2");
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].name).toBe("Burger");
  });
});

describe("cart.getCart / updateCartItem", () => {
  it("reports an empty cart when nothing was added", async () => {
    const res = await getCart("nobody");
    expect(res.isEmpty).toBe(true);
  });

  it("removes the item (and the cart) when quantity drops to 0", async () => {
    await addToCart("u1", { itemId: "item-1", quantity: 1 });
    const res = await updateCartItem("u1", "item-1", 0);
    expect(res.cart).toBeNull();
    const after = await getCart("u1");
    expect(after.isEmpty).toBe(true);
  });

  it("updates quantity and recomputes totals", async () => {
    await addToCart("u1", { itemId: "item-1", quantity: 1 });
    const res = await updateCartItem("u1", "item-1", 4);
    expect(res.cart.items[0].quantity).toBe(4);
    expect(res.cart.subtotal).toBe(800);
    expect(res.cart.totalAmount).toBe(830);
  });
});
