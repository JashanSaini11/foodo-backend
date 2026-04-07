// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Standardizes all API responses across the entire app
// Every response has the same shape → easier for frontend to handle

// ─── SUCCESS RESPONSE ─────────────────────────────────────────
// Used when everything works fine
// Example: { success: true, message: "Login successful", data: { user, token } }
export const successResponse = (
  res,
  { statusCode = 200, message = "Success", data = null },
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

// ─── ERROR RESPONSE ───────────────────────────────────────────
// Used when something goes wrong
// Example: { success: false, message: "Invalid email", errors: [...] }
export const errorResponse = (
  res,
  { statusCode = 500, message = "Internal Server Error", errors = null },
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};
