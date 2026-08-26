import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    // The integration tests (order.test.ts, cart.test.ts, wishlist.test.ts,
    // etc.) run real queries against DATABASE_URL — normally local
    // Postgres, sub-millisecond round trips, comfortably inside Vitest's
    // 5000/10000ms defaults. Whenever .env is instead pointed at a real
    // remote database (see the project's DB-in-prod memory note), the same
    // tests chain many real network round trips per test/hook and blow
    // past those defaults on latency alone, not a real failure. Raised
    // globally rather than patched test-by-test, since it affects most of
    // the integration suite, not just one file.
    testTimeout: 20000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
