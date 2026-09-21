import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

/**
 * TA-134: Shared accessibility scanning helper.
 *
 * Wraps @axe-core/playwright with a deliberate impact threshold:
 * - `serious` and `critical` violations FAIL the test.
 * - `moderate` and `minor` violations are reported in CI output but do not fail.
 *
 * Known exclusions carry inline comments explaining why they are suppressed.
 */

export interface AxeScanResult {
  /** Violations that meet the failing threshold (serious + critical). */
  failing: AxeViolation[];
  /** Violations below the threshold (moderate + minor), reported as warnings. */
  warnings: AxeViolation[];
}

export interface AxeViolation {
  id: string;
  impact: string;
  description: string;
  helpUrl: string;
  nodes: { html: string; target: string[] }[];
}

/**
 * Known rule exclusions with documented reasons.
 *
 * Every disabled rule MUST have a comment explaining why it is excluded.
 */
const KNOWN_EXCLUSIONS: string[] = [
  // color-contrast-enhanced: WCAG AAA enhanced contrast (7:1 ratio) is aspirational,
  // not required. We enforce WCAG AA (4.5:1) via the default color-contrast rule.
  "color-contrast-enhanced",
];

/**
 * Run an axe-core accessibility scan on the current page.
 *
 * @param page - Playwright Page instance (already navigated to the target URL)
 * @returns AxeScanResult with failing violations (serious/critical) and warnings (moderate/minor)
 */
export async function runAxeScan(page: Page): Promise<AxeScanResult> {
  const results = await new AxeBuilder({ page })
    .disableRules(KNOWN_EXCLUSIONS)
    .analyze();

  const failing: AxeViolation[] = [];
  const warnings: AxeViolation[] = [];

  for (const v of results.violations) {
    const entry: AxeViolation = {
      id: v.id,
      impact: v.impact ?? "unknown",
      description: v.description,
      helpUrl: v.helpUrl,
      nodes: v.nodes.map((n) => ({
        html: n.html,
        target: n.target.map(String),
      })),
    };

    if (v.impact === "serious" || v.impact === "critical") {
      failing.push(entry);
    } else {
      warnings.push(entry);
    }
  }

  // Log warnings to CI output so they are actionable without running locally
  if (warnings.length > 0) {
    console.log(
      `\n[A11y] ${warnings.length} non-blocking accessibility warning(s):`
    );
    for (const w of warnings) {
      console.log(
        `  ⚠ [${w.impact}] ${w.id}: ${w.description}`
      );
      for (const node of w.nodes.slice(0, 3)) {
        console.log(`    → ${node.target.join(" > ")}`);
        console.log(`      ${node.html.slice(0, 120)}`);
      }
      console.log(`    Help: ${w.helpUrl}`);
    }
  }

  // Log failing violations with full detail for CI diagnosis
  if (failing.length > 0) {
    console.log(
      `\n[A11y] ${failing.length} FAILING accessibility violation(s):`
    );
    for (const f of failing) {
      console.log(
        `  ✖ [${f.impact}] ${f.id}: ${f.description}`
      );
      for (const node of f.nodes) {
        console.log(`    → ${node.target.join(" > ")}`);
        console.log(`      ${node.html.slice(0, 200)}`);
      }
      console.log(`    Help: ${f.helpUrl}`);
    }
  }

  return { failing, warnings };
}

/**
 * Set the app to dark mode by writing to localStorage and reloading.
 *
 * The app reads `verity-user-settings` from localStorage on first paint
 * and applies `class="dark"` to <html> if the saved theme is "dark".
 */
export async function setDarkMode(page: Page): Promise<void> {
  await page.evaluate(() => {
    const settings = JSON.parse(
      localStorage.getItem("verity-user-settings") || "{}"
    );
    settings.theme = "dark";
    localStorage.setItem("verity-user-settings", JSON.stringify(settings));
  });
  await page.reload();
  // Wait for the dark class to be applied
  await page.waitForFunction(() =>
    document.documentElement.classList.contains("dark")
  );
}

/**
 * Set the app to light mode by writing to localStorage and reloading.
 */
export async function setLightMode(page: Page): Promise<void> {
  await page.evaluate(() => {
    const settings = JSON.parse(
      localStorage.getItem("verity-user-settings") || "{}"
    );
    settings.theme = "light";
    localStorage.setItem("verity-user-settings", JSON.stringify(settings));
  });
  await page.reload();
  // Wait for the dark class to be removed
  await page.waitForFunction(() =>
    !document.documentElement.classList.contains("dark")
  );
}

/**
 * Format violation summary for assertion error messages.
 */
export function formatViolationSummary(violations: AxeViolation[]): string {
  return violations
    .map(
      (v) =>
        `[${v.impact}] ${v.id}: ${v.description}\n` +
        v.nodes
          .map((n) => `  → ${n.target.join(" > ")}\n    ${n.html.slice(0, 120)}`)
          .join("\n") +
        `\n  Help: ${v.helpUrl}`
    )
    .join("\n\n");
}
