// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Connects to both PostgreSQL (via Prisma) and MongoDB (via Mongoose)
// Both connections are started in server.js when the app boots up

import { PrismaClient } from "@prisma/client";
import mongoose from "mongoose";

// ─── PRISMA CLIENT (PostgreSQL) ───────────────────────────────
// PrismaClient is the auto-generated DB client from your schema.prisma
// "log" shows SQL queries in terminal during development
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
});

export const connectPostgres = async () => {
  try {
    await prisma.$connect();
    console.log("✅ PostgreSQL connected via Prisma");
  } catch (error) {
    console.error("❌ PostgreSQL connection failed:", error.message);
    process.exit(1); // stop the server if DB fails
  }
};

// ─── MONGOOSE (MongoDB) ───────────────────────────────────────
// MongoDB stores restaurant & menu data (flexible schema)
export const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected via Mongoose");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

// Log when MongoDB disconnects unexpectedly
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB disconnected");
});
