// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Central router file — all module routes are registered here
// app.js imports just this one file instead of every module separately
// Easy to add new modules: just import and use below

import express from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import userRoutes from "../modules/user/user.routes.js"
import addressRoutes from "../modules/user/address/address.routes.js";
import restaurantRoutes from "../modules/restaurant/restaurant.routes.js";

// Future modules (uncomment as you build them):
// import orderRoutes from "../modules/order/order.routes.js";
// import deliveryRoutes from "../modules/delivery/delivery.routes.js";

const router = express.Router();

// ─── REGISTER ROUTES ──────────────────────────────────────────

router.use("/auth", authRoutes);
router.use("/users", userRoutes)
router.use("/users/addresses", addressRoutes);
router.use("/restaurants", restaurantRoutes);


// router.use("/orders", orderRoutes);
// router.use("/delivery", deliveryRoutes);

export default router;
