// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Global error handler — catches any error thrown anywhere in the app
// Also handles 404 for unknown routes

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────
// Express calls this automatically when next(error) is called
// Or when an unhandled error occurs in a route
export const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path} →`, err.message);

  // ─── Prisma Errors ────────────────────────────────────────
  // P2002 = unique constraint violation (e.g. duplicate email)
  if (err.code === "P2002") {
    return res.status(409).json({
      success: false,
      message: `This ${err.meta?.target?.join(", ")} is already in use.`,
    });
  }
  // P2025 = record not found in DB
  if (err.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "Record not found.",
    });
  }

  // ─── JWT Errors ───────────────────────────────────────────
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, message: "Invalid token." });
  }
  if (err.name === "TokenExpiredError") {
    return res
      .status(401)
      .json({
        success: false,
        message: "Token has expired. Please login again.",
      });
  }

  // ─── Default Error ────────────────────────────────────────
  const statusCode = err.statusCode || 500;

  // Never leak internal error details for unexpected 500s in
  // production — those messages can expose stack/DB internals.
  // Deliberate operational errors (4xx we threw ourselves) keep
  // their human-friendly message.
  const isServerError = statusCode >= 500;
  const exposeMessage =
    !isServerError || process.env.NODE_ENV !== "production";

  return res.status(statusCode).json({
    success: false,
    message: exposeMessage
      ? err.message || "Something went wrong. Please try again."
      : "Something went wrong. Please try again.",
  });
};

// ─── 404 NOT FOUND ────────────────────────────────────────────
// Catches requests to routes that don't exist
export const notFound = (req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} does not exist.`,
  });
};
