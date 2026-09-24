# Playwright E2E Testing Harness

This directory contains the browser end-to-end (E2E) testing suite for the Compliance Document Review system, established under **TA-130**. Subsequent flow tickets ([TA-131](https://aufatapiopa.atlassian.net/browse/TA-131), [TA-132](https://aufatapiopa.atlassian.net/browse/TA-132), [TA-133](https://aufatapiopa.atlassian.net/browse/TA-133), [TA-134](https://aufatapiopa.atlassian.net/browse/TA-134)) build on this harness.

### Accessibility Checks (TA-134)

Automated accessibility scanning is integrated via `@axe-core/playwright`. The shared helper in `tests/e2e/axe-helper.ts` wraps axe-core with a deliberate impact threshold:

- **Fail on**: `serious` and `critical` violations (the threshold is set in code, not left at library default)
- **Report without failing**: `moderate` and `minor` violations (logged to CI output for triage)
- **Dual-theme coverage**: Every screen is scanned in both light and dark mode
- **Known exclusions**: Any disabled rule carries an inline comment explaining why (see `KNOWN_EXCLUSIONS` in `axe-helper.ts`)

---

## Conventions for Flow Tickets

To ensure tests remain fast, reliable, maintainable, and deterministic, all flow tests must strictly adhere to the following conventions:

### 1. Locators: Role-Based and Accessible Names Over CSS Selectors
Always locate elements by user-facing, semantic attributes rather than implementation details (e.g. CSS classes, element tags, or arbitrary IDs):

- **Preferred**:
  - `page.getByRole('button', { name: /submit/i })`
  - `page.getByRole('heading', { name: /review queue/i })`
  - `page.getByLabel('Document Title')`
  - `page.getByPlaceholder('Search submissions...')`
  - `page.getByText('Approved')`
- **Avoid**:
  - `page.locator('.btn-primary')`
  - `page.locator('div > span:nth-child(2)')`
  - `page.locator('#custom-id-xyz')`

### 2. Auto-Waiting Assertions Over Manual Waits
Never introduce manual delays, fixed sleeps, or `page.waitForTimeout()`:
- **Preferred**:
  - `await expect(page.getByRole('dialog')).toBeVisible();`
  - `await expect(page).toHaveURL(/\/advisor/);`
  - `await expect(page.getByText('Submission successful')).toBeVisible();`
- **Strictly Prohibited**:
  - `await page.waitForTimeout(3000);` // NEVER use fixed sleeps
  - Arbitrary `setTimeout` loops

### 3. Authentication Reuse via `storageState`
Do **NOT** sign up or log in through the UI in every single test. This is the primary cause of slow, brittle test suites:
- Use pre-authenticated sessions provided by `advisorTest` and `officerTest` in `tests/e2e/fixtures.ts`:
  ```ts
  import { advisorTest, expect } from "./fixtures";

  advisorTest("advisor can upload a document", async ({ page }) => {
    await page.goto("/advisor");
    // Already authenticated as an advisor!
  });
  ```
- Or assign the storageState explicitly:
  ```ts
  test.use({ storageState: ADVISOR_STORAGE_STATE });
  ```

### 4. Test Data Isolation (The TA-104 Rule)
Every test run must operate in its own sandbox to avoid polluting live data or the precedent index:
- Test accounts and documents are created under a unique per-run prefix (e.g., `e2e_<timestamp>_<random>`).
- Global teardown calls `scripts/cleanup_e2e_run.py` to remove all test users, documents, and ensure `precedent_index` has zero residue.
- When creating test documents in flow tickets, use unique filenames like `${runPrefix}_document.pdf`.

### 5. Single User-Visible Outcome Per Test
Each test should verify **one** distinct, meaningful user workflow and assert on the observable outcome (e.g. status badge change, notification banner, redirection), rather than testing internal state.

### 6. Timeouts and Retries Belong to the Config
Do not hardcode custom timeouts inside individual tests unless testing an intentional long-polling operation. `playwright.config.ts` owns timeouts, retries, and browser viewport settings.

---

## Running the Suite

### Prerequisites
The application stack must be running (either via Docker Compose or locally):
```bash
# Start backend and frontend via Docker Compose
./scripts/setup.sh
docker compose up -d frontend
```

### Run Tests
```bash
# Run all end-to-end tests
npx playwright test

# Run in interactive UI mode
npx playwright test --ui

# Run in headed browser mode
npx playwright test --headed

# Run against custom base URL
PLAYWRIGHT_TEST_BASE_URL=https://104-211-102-169.sslip.io npx playwright test
```

> ⚠️ **Running against a deployed URL creates real users and documents on
> that environment's database** -- but global teardown's cleanup
> (`docker compose run --rm backend python scripts/cleanup_e2e_run.py`)
> connects to whatever Postgres *your local* `docker-compose.yml` points
> at, not the deployed environment's database. `PLAYWRIGHT_TEST_BASE_URL`
> only redirects Playwright's browser and API calls -- it has no effect
> on the cleanup script's DB connection. So the TA-104 cleanup guarantee
> above does **not** hold when run this way: test data will accumulate
> on the deployed environment run after run. To actually clean up after
> a deployed-environment run, invoke the cleanup script with
> `DATABASE_URL` pointed at that environment's database, or plan on
> removing the rows manually.

### Viewing Reports & Diagnostics
When tests complete (or fail), Playwright retains traces, screenshots, and videos in `test-results/`:
```bash
# Open interactive HTML test report
npx playwright show-report
```

---

## CI Pipeline Integration

In GitHub Actions (`.github/workflows/tests.yml`):
- Runs on **Pull Requests to `main`** and on **direct pushes to `main`** (`test-e2e` job).
- Starts clean compose stack, verifies backend & frontend readiness via non-blocking polling.
- Runs `npx playwright test`.
- Uploads `playwright-report/` and `test-results/` as downloadable CI artifacts upon failure.
- Tears down with `docker compose down -v` in an `always()` step.
