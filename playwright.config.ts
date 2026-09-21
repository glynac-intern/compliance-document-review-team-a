import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for Compliance Document Review System (TA-130).
 *
 * Configures browser pinning (Chromium / Desktop Chrome), timeouts, retries,
 * global session setup with auth reuse via storageState, test data isolation,
 * and diagnostic capture (trace, screenshot, video) retained on failure.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,

  /* Global timeout per test */
  timeout: 30 * 1000,

  /* Expect assertions timeout */
  expect: {
    timeout: 5000,
  },

  /* Run tests sequentially in CI for determinism and avoid shared data races */
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,

  /* Fail build on CI if test.only is committed */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Reporter config: list + HTML report */
  reporter: process.env.CI
    ? [
        ["list"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
      ]
    : [["list"], ["html", { open: "never" }]],

  /* Setup and teardown hooks */
  globalSetup: require.resolve("./e2e/global-setup.ts"),
  globalTeardown: require.resolve("./e2e/global-teardown.ts"),

  /* Shared settings for all projects */
  use: {
    baseURL:
      process.env.PLAYWRIGHT_TEST_BASE_URL ||
      process.env.BASE_URL ||
      "http://localhost:3000",

    /* Diagnostics retained on failure for CI artifact inspection */
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",

    /* Standard viewport matching typical desktop display */
    viewport: { width: 1280, height: 720 },

    /* Action timeout */
    actionTimeout: 10000,
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
