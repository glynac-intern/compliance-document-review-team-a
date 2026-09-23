import { chromium, type FullConfig, request } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

export const AUTH_DIR = path.resolve(__dirname, "../../.auth");
export const ADVISOR_STORAGE_STATE = path.join(AUTH_DIR, "advisor.json");
export const OFFICER_STORAGE_STATE = path.join(AUTH_DIR, "officer.json");
export const RUN_INFO_PATH = path.join(AUTH_DIR, "run-info.json");

/**
 * Global Setup for Playwright E2E Suite.
 *
 * 1. Generates a unique run prefix (TA-104 isolation).
 * 2. Creates dedicated advisor and officer test accounts for this run.
 * 3. Authenticates each account once and persists session tokens via storageState.
 * 4. Enables test cases to reuse stored sessions without signing up/in through the UI.
 */
async function globalSetup(config: FullConfig) {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const runPrefix =
    process.env.E2E_RUN_ID ||
    `e2e_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const advisorData = {
    name: `E2E Advisor ${runPrefix}`,
    email: `advisor_${runPrefix}@example.com`,
    password: "TestPassword123!",
    role: "advisor" as const,
  };

  const officerData = {
    name: `E2E Officer ${runPrefix}`,
    email: `officer_${runPrefix}@example.com`,
    password: "TestPassword123!",
    role: "officer" as const,
  };

  const baseURL =
    config.projects[0]?.use?.baseURL ||
    process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.BASE_URL ||
    "https://104-211-102-169.sslip.io";

  const apiUrl =
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "https://api.104-211-102-169.sslip.io";

  // Record run info for teardown and test isolation
  fs.writeFileSync(
    RUN_INFO_PATH,
    JSON.stringify(
      {
        runPrefix,
        baseURL,
        apiUrl,
        advisor: advisorData,
        officer: officerData,
        createdAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  console.log(`[E2E Setup] Run ID: ${runPrefix}`);
  console.log(`[E2E Setup] Base URL: ${baseURL} | API URL: ${apiUrl}`);

  // Create accounts via API
  const apiContext = await request.newContext({ baseURL: apiUrl });

  let advisorToken = "";
  let officerToken = "";

  try {
    const advSignup = await apiContext.post("/auth/signup", {
      data: advisorData,
    });
    if (!advSignup.ok() && advSignup.status() !== 400) {
      console.warn(`[E2E Setup] Advisor signup status: ${advSignup.status()}`);
    }
  } catch (err) {
    console.warn("[E2E Setup] Advisor API signup error:", err);
  }

  try {
    const offSignup = await apiContext.post("/auth/signup", {
      data: officerData,
    });
    if (!offSignup.ok() && offSignup.status() !== 400) {
      console.warn(`[E2E Setup] Officer signup status: ${offSignup.status()}`);
    }
  } catch (err) {
    console.warn("[E2E Setup] Officer API signup error:", err);
  }

  try {
    const advLogin = await apiContext.post("/auth/login", {
      data: { email: advisorData.email, password: advisorData.password },
    });
    if (advLogin.ok()) {
      const data = await advLogin.json();
      advisorToken = data.access_token;
    }
  } catch (err) {
    console.warn("[E2E Setup] Advisor API login error:", err);
  }

  try {
    const offLogin = await apiContext.post("/auth/login", {
      data: { email: officerData.email, password: officerData.password },
    });
    if (offLogin.ok()) {
      const data = await offLogin.json();
      officerToken = data.access_token;
    }
  } catch (err) {
    console.warn("[E2E Setup] Officer API login error:", err);
  }

  // Parse origin for storageState
  let origin = "https://104-211-102-169.sslip.io";
  try {
    origin = new URL(baseURL).origin;
  } catch {
    origin = "https://104-211-102-169.sslip.io";
  }

  // Write storageState files
  if (advisorToken) {
    const advisorState = {
      cookies: [],
      origins: [
        {
          origin,
          localStorage: [
            {
              name: "verity_session_token",
              value: advisorToken,
            },
          ],
        },
      ],
    };
    fs.writeFileSync(ADVISOR_STORAGE_STATE, JSON.stringify(advisorState, null, 2));
    console.log(`[E2E Setup] Saved advisor storageState to ${ADVISOR_STORAGE_STATE}`);
  }

  if (officerToken) {
    const officerState = {
      cookies: [],
      origins: [
        {
          origin,
          localStorage: [
            {
              name: "verity_session_token",
              value: officerToken,
            },
          ],
        },
      ],
    };
    fs.writeFileSync(OFFICER_STORAGE_STATE, JSON.stringify(officerState, null, 2));
    console.log(`[E2E Setup] Saved officer storageState to ${OFFICER_STORAGE_STATE}`);
  }

  // If token generation via direct API didn't succeed, use browser UI login fallback
  if (!advisorToken || !officerToken) {
    console.log("[E2E Setup] Direct API tokens absent; launching browser to authenticate via UI...");
    const browser = await chromium.launch();

    if (!advisorToken) {
      const context = await browser.newContext({ baseURL });
      const page = await context.newPage();
      try {
        await page.goto("/login");
        await page.locator("#email").fill(advisorData.email);
        await page.locator("#password").fill(advisorData.password);
        await page.getByRole("button", { name: /sign in/i }).click();
        await page.waitForURL("**/advisor");
        await context.storageState({ path: ADVISOR_STORAGE_STATE });
        console.log("[E2E Setup] Advisor UI login succeeded and session saved.");
      } catch (e) {
        console.warn("[E2E Setup] Advisor UI login fallback error:", e);
      } finally {
        await context.close();
      }
    }

    if (!officerToken) {
      const context = await browser.newContext({ baseURL });
      const page = await context.newPage();
      try {
        await page.goto("/login");
        await page.locator("#email").fill(officerData.email);
        await page.locator("#password").fill(officerData.password);
        await page.getByRole("button", { name: /sign in/i }).click();
        await page.waitForURL("**/officer");
        await context.storageState({ path: OFFICER_STORAGE_STATE });
        console.log("[E2E Setup] Officer UI login succeeded and session saved.");
      } catch (e) {
        console.warn("[E2E Setup] Officer UI login fallback error:", e);
      } finally {
        await context.close();
      }
    }

    await browser.close();
  }

  await apiContext.dispose();
}

export default globalSetup;
