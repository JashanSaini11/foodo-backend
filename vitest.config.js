import { defineConfig } from "vitest/config";

// ─── VITEST CONFIG ────────────────────────────────────────────
// - Node environment (this is a backend, no DOM)
// - `tests/setup.js` runs before every file to seed env vars and
//   silence noisy console output.
// - Coverage focuses on the business logic we actually unit-test.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.js"],
    include: ["tests/**/*.test.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.js"],
      exclude: [
        "src/config/**",
        "src/**/*.routes.js",
        "src/**/*.route.js",
        "src/**/*.validation.js",
      ],
    },
  },
});
