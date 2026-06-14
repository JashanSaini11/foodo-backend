// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Central router file — all module routes are registered here
// app.js imports just this one file instead of every module separately
// Easy to add new modules: just import and use below

import express from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import userRoutes from "../modules/user/user.routes.js"
import addressRoutes from "../modules/user/address/address.routes.js";
import restaurantRoutes from "../modules/restaurant/restaurant.routes.js";
import cartRoutes from "../modules/order/cart/cart.routes.js";
import orderRoutes from "../modules/order/order.routes.js";
import paymentRoutes from "../modules/order/payment/payment.route.js";
import deliveryRoutes from "../modules/delivery/delivery.routes.js";
import adminRoutes from "../modules/admin/admin.routes.js";




const router = express.Router();

// ─── REGISTER ROUTES ──────────────────────────────────────────

router.use("/auth", authRoutes);
router.use("/users", userRoutes)
router.use("/users/addresses", addressRoutes);
router.use("/restaurants", restaurantRoutes);
router.use("/cart", cartRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/delivery", deliveryRoutes);
router.use("/admin", adminRoutes);


export default router;
