// server.js

// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Entry point of the entire backend
// Loads env → connects databases → starts Express + Socket.io server

import "dotenv/config";
import { createServer } from "http";
import app from "./src/app.js";
import { connectPostgres, connectMongoDB } from "./src/config/db.js";
import redisClient from "./src/config/redis.js";
import { initSocket } from "./src/config/socket.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // ─── Connect all databases ────────────────────────────────
    await connectPostgres();
    await connectMongoDB();
    // Redis connects automatically on import

    // ─── Create HTTP server ───────────────────────────────────
    // We wrap Express in http.createServer so Socket.io can attach to it
    // Without this, Socket.io can't work alongside Express
    const httpServer = createServer(app);

    // ─── Initialize Socket.io ─────────────────────────────────
    initSocket(httpServer);

    // ─── Start listening ──────────────────────────────────────
    httpServer.listen(PORT, () => {
      console.log("\n🚀 ─────────────────────────────────────────────");
      console.log(`   Foodo API running on port ${PORT}`);
      console.log(`   Environment  : ${process.env.NODE_ENV}`);
      console.log(`   Health check : http://localhost:${PORT}/health`);
      console.log(`   API Docs     : http://localhost:${PORT}/api/docs`);
      console.log(`   Socket.io    : ✅ Ready`);
      console.log("─────────────────────────────────────────────\n");
    });

    // ─── Graceful shutdown ────────────────────────────────────
    const shutdown = async (signal) => {
      console.log(`\n⚠️  ${signal} received. Shutting down...`);
      httpServer.close(async () => {
        await redisClient.quit();
        console.log("✅ Server stopped.");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();