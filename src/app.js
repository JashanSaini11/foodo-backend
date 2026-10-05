// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Creates and configures the Express app
// Sets up all middleware, routes, and error handlers
// server.js imports this and starts listening on a port

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import passport from "./config/passport.js";
import routes from "./routes/index.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import { errorHandler, notFound } from "./middlewares/error.middleware.js";

const app = express();

// ─── TRUST PROXY ──────────────────────────────────────────────
// Behind a reverse proxy / load balancer (Nginx, Render, Railway,
// GHCR-deployed container, etc.) the real client IP arrives in the
// X-Forwarded-* headers. Trusting the proxy makes express-rate-limit
// key on the real IP and lets `secure` cookies work over TLS
// terminated at the proxy.
app.set("trust proxy", 1);

// ─── SECURITY MIDDLEWARE ──────────────────────────────────────
// helmet → sets secure HTTP headers (prevents common attacks)
app.use(helmet());

// ─── GLOBAL RATE LIMITER ──────────────────────────────────────
// A coarse safety net across the whole API (per-route limiters on
// auth endpoints are stricter). NOTE: this uses an in-memory store,
// which is per-instance — see docs/PRODUCTION_AUDIT.md for the
// shared-store (Redis) upgrade needed when running >1 instance.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
});
app.use("/api", globalLimiter);

// cors → allows requests from your Next.js frontend
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true, // allows cookies to be sent cross-origin
  }),
);

// ─── BODY PARSING ─────────────────────────────────────────────

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Parses cookies from request headers (needed for refresh token cookie)
app.use(cookieParser());

// ─── LOGGING ──────────────────────────────────────────────────
// Shows all requests in terminal during development
// e.g. POST /api/auth/login 200 45ms
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ─── PASSPORT ─────────────────────────────────────────────────
// Initializes passport strategies (JWT + Google OAuth)
app.use(passport.initialize());

// ─── HEALTH CHECK ─────────────────────────────────────────────
// Quick endpoint to verify server is running (used by Docker/hosting)
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Foodo API is running 🚀",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ─── SWAGGER DOCS ─────────────────────────────────────────────
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: "Foodo API Docs",
  customCss: ".swagger-ui .topbar { background-color: #e65c00; }",
}));

// ─── API ROUTES ───────────────────────────────────────────────
app.use("/api", routes);

// ─── ERROR HANDLERS ───────────────────────────────────────────
// Must be AFTER routes (Express processes in order)
app.use(notFound); // 404 for unknown routes
app.use(errorHandler); // catches all errors thrown in routes

export default app;
