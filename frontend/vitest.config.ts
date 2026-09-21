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
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
