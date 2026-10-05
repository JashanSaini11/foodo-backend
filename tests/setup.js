// ─── TEST SETUP ───────────────────────────────────────────────
// Runs once before each test file. Sets the env vars the code
// expects so modules that read process.env at import time (jwt,
// payment, etc.) have sane values and never touch real services.

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.JWT_ACCESS_EXPIRES_IN = "1h";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";
process.env.RAZORPAY_KEY_ID = "rzp_test_key";
process.env.RAZORPAY_KEY_SECRET = "rzp_test_secret";
process.env.CLIENT_URL = "http://localhost:3000";

// Several modules construct third-party clients at import time
// (Google OAuth strategy throws without a clientID, Resend without a
// key, etc.). Dummy values keep imports side-effect free in tests.
process.env.GOOGLE_CLIENT_ID = "test-google-id";
process.env.GOOGLE_CLIENT_SECRET = "test-google-secret";
process.env.GOOGLE_CALLBACK_URL = "http://localhost:5000/api/auth/google/callback";
process.env.RESEND_API_KEY = "re_test_key";
process.env.EMAIL_FROM = "Foodo <test@foodo.dev>";
process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
process.env.CLOUDINARY_API_KEY = "test-key";
process.env.CLOUDINARY_API_SECRET = "test-secret";
process.env.GOOGLE_MAPS_API_KEY = "test-maps-key";
