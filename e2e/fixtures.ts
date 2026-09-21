import { test as base, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

export const AUTH_DIR = path.resolve(__dirname, "../.auth");
export const ADVISOR_STORAGE_STATE = path.join(AUTH_DIR, "advisor.json");
export const OFFICER_STORAGE_STATE = path.join(AUTH_DIR, "officer.json");
export const RUN_INFO_PATH = path.join(AUTH_DIR, "run-info.json");

export interface RunInfo {
  runPrefix: string;
  baseURL: string;
  apiUrl: string;
  advisor: {
    name: string;
    email: string;
    role: "advisor";
  };
  officer: {
    name: string;
    email: string;
    role: "officer";
  };
}

export function getRunInfo(): RunInfo | null {
  if (fs.existsSync(RUN_INFO_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(RUN_INFO_PATH, "utf-8")) as RunInfo;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Fixture providing an authenticated Advisor session.
 * Reuses storageState established during global setup.
 */
export const advisorTest = base.extend<{ advisorPage: Page }>({
  storageState: fs.existsSync(ADVISOR_STORAGE_STATE) ? ADVISOR_STORAGE_STATE : undefined,
  advisorPage: async ({ page }, use) => {
    await use(page);
  },
});

/**
 * Fixture providing an authenticated Officer session.
 * Reuses storageState established during global setup.
 */
export const officerTest = base.extend<{ officerPage: Page }>({
  storageState: fs.existsSync(OFFICER_STORAGE_STATE) ? OFFICER_STORAGE_STATE : undefined,
  officerPage: async ({ page }, use) => {
    await use(page);
  },
});

export { expect, base as test };
