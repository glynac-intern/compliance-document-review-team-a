import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for Compliance Document Review System (TA-130).
 *
 * Configures browser pinning (Chromium / Desktop Chrome), timeouts, retries,
 * global session setup with auth reuse via storageState, test data isolation,
 * and diagnostic capture (trace, screenshot, video) retained on failure.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /.*\.spec\.ts/,

  /* Global timeout per test */
  timeout: process.env.PLAYWRIGHT_TIMEOUT
    ? parseInt(process.env.PLAYWRIGHT_TIMEOUT, 10)
    : 60000,

  /* Expect assertions timeout */
  expect: {
    timeout: 10000,
  },

  /* Run tests sequentially for determinism and avoid shared data races on live environment */
  fullyParallel: false,
  workers: process.env.PLAYWRIGHT_WORKERS
    ? parseInt(process.env.PLAYWRIGHT_WORKERS, 10)
    : 1,

  /* Fail build on CI if test.only is committed */
  forbidOnly: !!process.env.CI,

  /* Retry on failure (default 1 for live environment resilience) */
  retries:
    process.env.PLAYWRIGHT_RETRIES !== undefined
      ? parseInt(process.env.PLAYWRIGHT_RETRIES, 10)
      : 1,

  /* Reporter config: list + json (with live-results.json output) */
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile:
          process.env.PLAYWRIGHT_JSON_OUTPUT_NAME ||
          "test-results/live-results.json",
      },
    ],
  ],

  /* Setup and teardown hooks */
  globalSetup: require.resolve("./tests/e2e/global-setup.ts"),
  globalTeardown: require.resolve("./tests/e2e/global-teardown.ts"),

  /* Shared settings for all projects */
  use: {
    baseURL:
      process.env.PLAYWRIGHT_TEST_BASE_URL ||
      process.env.BASE_URL ||
      "https://104-211-102-169.sslip.io",

    /* Diagnostics retained on failure for CI artifact inspection */
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",

    /* Standard viewport matching typical desktop display */
    viewport: { width: 1280, height: 720 },

    /* Action timeout */
    actionTimeout: 15000,
  },

  /* Output directory for test artifacts (traces, videos, screenshots) */
  outputDir: "test-results",

  /* Pin browser to Desktop Chrome / Chromium */
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
