// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Sets up Socket.io for real-time communication
// Used for:
//   1. Live delivery partner location tracking
//   2. Real-time order status updates
//   3. Restaurant notifications for new orders

import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "./db.js";

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    // ─── AUTHENTICATION MIDDLEWARE ──────────────────────────────
    // Every socket connection must have a valid JWT token
    io.use(async (socket, next) => {
        try {
            // Token can come from cookie or auth header
            const token =
                socket.handshake.auth?.token ||
                socket.handshake.headers?.cookie
                    ?.split(";")
                    ?.find((c) => c.trim().startsWith("accessToken="))
                    ?.split("=")[1];

            if (!token) {
                return next(new Error("Authentication required"));
            }

            const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

            const user = await prisma.user.findUnique({
                where: { id: payload.userId },
                select: { id: true, name: true, role: true },
            });

            if (!user) {
                return next(new Error("User not found"));
            }

            socket.user = user; // attach user to socket
            next();
        } catch (error) { 
            next(new Error("Invalid token"));
        }
    });

    // ─── CONNECTION HANDLER ─────────────────────────────────────
    io.on("connection", (socket) => {
        console.log(`🔌 Socket connected: ${socket.user.name} (${socket.user.role})`);

        // ─── JOIN ROOM ──────────────────────────────────────────
        // Each user joins their own room → for private notifications
        socket.join(`user:${socket.user.id}`);

        // Restaurant owners join restaurant rooms
        if (socket.user.role === "RESTAURANT_OWNER") {
            socket.on("join_restaurant", (restaurantId) => {
                socket.join(`restaurant:${restaurantId}`);
                console.log(`🍴 Restaurant owner joined: restaurant:${restaurantId}`);
            });
        }

        // ─── DELIVERY PARTNER LOCATION ──────────────────────────
        // Partner sends location → customer tracking that order receives it
        socket.on("partner_location_update", async ({ orderId, latitude, longitude }) => {
            try {
                // Emit to the customer who placed this order
                io.to(`order:${orderId}`).emit("location_updated", {
                    latitude,
                    longitude,
                    updatedAt: new Date(),
                });
            } catch (error) {
                console.error("Location update error:", error.message);
            }
        });

        // ─── TRACK ORDER ────────────────────────────────────────
        // Customer joins order room to receive live updates
        socket.on("track_order", (orderId) => {
            socket.join(`order:${orderId}`);
            console.log(`📍 User tracking order: ${orderId}`);
        });

        // ─── STOP TRACKING ──────────────────────────────────────
        socket.on("stop_tracking", (orderId) => {
            socket.leave(`order:${orderId}`);
        });

        // ─── DISCONNECT ─────────────────────────────────────────
        socket.on("disconnect", () => {
            console.log(`🔌 Socket disconnected: ${socket.user.name}`);
        });
    });

    console.log("✅ Socket.io initialized");
    return io;
};

// ─── EMIT HELPERS ─────────────────────────────────────────────
// Used by services to send real-time notifications

// Notify restaurant of new order
export const notifyRestaurant = (restaurantId, order) => {
    if (io) {
        io.to(`restaurant:${restaurantId}`).emit("new_order", order);
    }
};

// Notify customer of order status update
export const notifyOrderStatus = (userId, orderId, status) => {
    if (io) {
        io.to(`user:${userId}`).emit("order_status_updated", { orderId, status });
        io.to(`order:${orderId}`).emit("order_status_updated", { orderId, status });
    }
};

// Notify partner of delivery assignment
export const notifyPartner = (partnerId, delivery) => {
    if (io) {
        io.to(`user:${partnerId}`).emit("delivery_assigned", delivery);
    }
};

export const getIO = () => io;