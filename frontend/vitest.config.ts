import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    env: {
      // TA-124: lib/api-client.ts throws at import time without this
      // outside NODE_ENV=development -- vitest doesn't set that, so
      // any test importing a module that touches api-client.ts (even
      // transitively) needs it defined. Not a real backend call site;
      // the integration test mocks documentsApi.submit itself.
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:8000",
    },
    // TA-126: all: true is what makes this honest -- without it,
    // v8 only reports on files some test file actually imports, which
    // would hide the (currently large) share of components with zero
    // test coverage entirely from the denominator instead of counting
    // them as uncovered. Measured baseline (npm run test:coverage) on
    // commit c91d8d9, 2026-09-22: statements 10.03%, branches 64.85%,
    // functions 53.84%, lines 10.03%. Thresholds below are set at the
    // whole-number floor of each -- a ratchet, not a target; lowering
    // any of them needs a stated reason, same as the backend's
    // fail_under.
    coverage: {
      provider: "v8",
      all: true,
      include: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
      exclude: ["**/*.d.ts", "**/node_modules/**"],
      reporter: ["text", "text-summary"],
      thresholds: {
        lines: 10,
        statements: 10,
        functions: 53,
        branches: 64,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
