// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Entry point of the entire backend
// Loads env variables → connects all databases → starts Express server

import "dotenv/config"; // loads .env variables first (must be first import)
console.log("Maps Key:", process.env.GOOGLE_MAPS_API_KEY);
import app from "./src/app.js";
import { connectPostgres, connectMongoDB } from "./src/config/db.js";
import redisClient from "./src/config/redis.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // ─── Connect all databases in order ──────────────────────
    await connectPostgres(); // PostgreSQL via Prisma
    await connectMongoDB(); // MongoDB via Mongoose
    // Redis connects automatically when imported (see redis.js)

    // ─── Start Express server ─────────────────────────────────
    const server = app.listen(PORT, () => {
      console.log("\n🚀 ─────────────────────────────────────────────");
      console.log(`   Foodo API is running on port ${PORT}`);
      console.log(`   Environment  : ${process.env.NODE_ENV}`);
      console.log(`   Health check : http://localhost:${PORT}/health`);
      console.log("─────────────────────────────────────────────\n");
    });

    // ─── Graceful Shutdown ────────────────────────────────────
    // When server is stopped (Ctrl+C or deployment), close connections cleanly
    const shutdown = async (signal) => {
      console.log(`\n⚠️  ${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await redisClient.quit(); // close Redis connection
        console.log("✅ All connections closed. Server stopped.");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM")); // production stop signal
    process.on("SIGINT", () => shutdown("SIGINT")); // Ctrl+C in terminal
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1); // exit with error code
  }
};

startServer();
