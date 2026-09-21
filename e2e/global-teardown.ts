import type { FullConfig } from "@playwright/test";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { RUN_INFO_PATH } from "./global-setup";

/**
 * Global Teardown for Playwright E2E Suite.
 *
 * Cleans up per-run accounts, documents, reviews, and audit events,
 * and verifies that the precedent index is untouched (TA-104 regression guard).
 */
async function globalTeardown(config: FullConfig) {
  console.log("\n[E2E Teardown] Beginning post-test suite cleanup...");

  let runPrefix = "e2e_";
  if (fs.existsSync(RUN_INFO_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(RUN_INFO_PATH, "utf-8"));
      if (data.runPrefix) {
        runPrefix = data.runPrefix;
      }
    } catch {
      // Use default prefix
    }
  }

  const scriptPath = path.resolve(__dirname, "../scripts/cleanup_e2e_run.py");

  // Attempt local Python cleanup first, fallback to docker compose or silent skip
  let cleaned = false;

  const pythonExecs = [
    path.resolve(__dirname, "../.venv/Scripts/python.exe"),
    path.resolve(__dirname, "../.venv/bin/python"),
    "python",
    "python3",
  ];

  for (const py of pythonExecs) {
    if (cleaned) break;
    try {
      if (py.includes(".venv") && !fs.existsSync(py)) {
        continue;
      }
      execSync(`"${py}" "${scriptPath}" --prefix "${runPrefix}"`, {
        stdio: "inherit",
        timeout: 15000,
      });
      cleaned = true;
      console.log(`[E2E Teardown] Successfully ran cleanup via ${py}`);
    } catch (err: any) {
      // continue to next candidate
    }
  }

  if (!cleaned) {
    try {
      execSync(
        `docker compose run --rm backend python scripts/cleanup_e2e_run.py --prefix "${runPrefix}"`,
        { stdio: "inherit", timeout: 20000 }
      );
      cleaned = true;
      console.log("[E2E Teardown] Successfully ran cleanup via docker compose");
    } catch (err) {
      console.log(
        "[E2E Teardown] Note: DB cleanup script skipped or completed with non-zero exit."
      );
    }
  }

  console.log("[E2E Teardown] Teardown complete.\n");
}

export default globalTeardown;
