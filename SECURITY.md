# Dependency vulnerability handling

## How scanning works

- `pip-audit -r backend/requirements.txt` runs in CI on every push (`dependency-scan` job), resolving the full transitive tree from the pinned requirements file, not just the current environment.
- `npm audit --audit-level=high` runs in CI on every push, for both `frontend/` and the root Playwright e2e manifest.
- `.github/dependabot.yml` opens a PR for outdated pip/npm/docker/github-actions dependencies weekly, so upgrades don't require someone to remember to run a manual sweep.

## What fails the build

- **pip-audit: any finding not explicitly ignored fails the build.** pip-audit's underlying data (OSV) doesn't reliably carry a severity/CVSS rating for Python advisories the way npm's does, so there's no consistent severity field to threshold on. Every finding must be triaged into a fix or an explicit ignore entry in `.github/pip-audit-ignore.txt` (see below) — nothing passes silently.
- **npm audit: `--audit-level=high` fails the build.** Moderate-and-below findings are visible in the job output/summary but don't block a merge.

Both choices are deliberate, not tool defaults left unexamined (see the ticket, TA-127).

## What TA-127 fixed

Real findings from the first `pip-audit` run, fixed via version bumps in `backend/requirements.txt` (all 236 backend tests still pass after the bump — one test, `test_ta112_upload_filename_probe.py`, was updated to match python-multipart's new, stricter header-size limit rather than the old permissive behavior):

- **`starlette` unbounded multipart-field buffering (PYSEC-2026-1943, CVSS 8.7)** — fixed by bumping `fastapi` 0.115.0 → 0.115.6 (raises its allowed starlette ceiling to `<0.42.0`) and pinning `starlette==0.41.3` explicitly. This app's document-upload endpoint is exactly the affected code path, and self-signup means any registered user (not just a compromised account) can reach it.
- **`python-jose` JWS algorithm-confusion (PYSEC-2024-232/233) and JWE decompression-bomb DoS (PYSEC-2025-185)** — fixed by bumping to 3.4.0. `pip-audit` now reports zero findings against `python-jose` itself.
- **`python-multipart` DoS findings (PYSEC-2026-1851/1852/3036-3040)** — fixed by bumping to 0.0.31.
- **`python-dotenv` (PYSEC-2026-2270)** — fixed by bumping to 1.2.2.
- **`xlsx` (SheetJS) prototype pollution + ReDoS, both High severity (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9)** — real, reachable attack surface: `components/documents/xlsx-preview.tsx` calls `XLSX.read()` directly on the bytes of a user-uploaded document to preview it in-browser, so a malicious advisor (self-signup) could craft a file that trips this in an officer's browser on preview. No fix exists on the public npm registry — SheetJS stopped publishing patched releases there and only distributes fixed builds from their own CDN. Fixed by pointing `frontend/package.json`'s `xlsx` dependency at `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (SheetJS's own documented install path for a non-EOL package). Verified: frontend test suite (37 tests, including the XLSX-preview test), `tsc --noEmit`, `next build`, and `eslint` all pass unchanged against it.

## Accepted risks (as of 2026-09-22, TA-127)

Each ID below is listed in `.github/pip-audit-ignore.txt`, which the `dependency-scan` job reads to build its `--ignore-vuln` flags. The same reasoning is duplicated as a comment next to the relevant pin in `backend/requirements.txt`.

| Package | ID(s) | Severity | Why accepted |
|---|---|---|---|
| `ecdsa` (transitive, via `python-jose`) | PYSEC-2026-1325 | High (7.4) | Minerva timing attack on ECDSA signing/keygen. No fix upstream (maintainers have stated side-channel attacks are out of scope). Not reachable here: `backend/auth/security.py` hardcodes `ALGORITHM = "HS256"` — this app never performs an ECDSA operation. |
| `pyasn1` (transitive, via `python-jose`/`rsa`) | PYSEC-2026-2263, 3455, 3456, 3457 | High (7.5) | DoS via deeply-nested ASN.1 recursion. Same unreachability as `ecdsa` (no ASN.1 parsing of attacker input happens in this app's HS256-only flow) — and blocked from upgrading regardless, since `python-jose` 3.4.0 itself pins `pyasn1<0.5.0`, a full major version behind the 0.6.3 fix. |
| `pytest` | PYSEC-2026-1845 | Not rated | Test runner only ever processes code this team wrote, never attacker-supplied input — no realistic exploitation path. The fix is a major-version bump (9.x) with real risk of breaking `pytest-cov`/`anyio` plugin compatibility, for no security benefit. Revisit opportunistically. |
| `pypdf` | 41 findings, 5.1.0 → fixed piecemeal through 6.16.1 | Mostly Medium (CWE-400, uncontrolled resource consumption — infinite loops / memory exhaustion on a crafted PDF); nothing RCE or info-disclosure found across everything sampled during triage | This **is** real attack surface (the analysis pipeline parses arbitrary user-uploaded PDFs), but the fix is a 5.x → 6.x major-version bump that needs a dedicated regression pass against every `PdfReader`/`PdfWriter` call site. Too large to fold into this ticket. Tracked as **TA-135**. |
| `starlette` (transitive, via `fastapi`) | PYSEC-2026-161 (fix 1.0.1), 1941 (fix 0.47.2), **1942 (fix 0.49.1)**, 2280/2281 (fix 1.1.0), 248/249 (fix 1.3.0/1.3.1) | Medium–High | The most severe finding (PYSEC-2026-1943, CVSS 8.7) is fixed by this ticket's `fastapi`/`starlette` bump. These remain because they need a starlette version past what `fastapi` 0.115.x allows (`<0.42.0`) — a much bigger `fastapi` jump. **PYSEC-2026-1942 (CVSS 7.5) is the priority for that follow-up**: it's an O(n²) Range-header DoS in `FileResponse`/`StaticFiles`, and this app's `GET /documents/{id}/file` endpoint uses `FileResponse` directly — reachable by any authenticated user. PYSEC-2026-248/249 don't apply to this app's usage (they're about `max_fields`/`max_part_size` limits and urlencoded-form handling this app doesn't rely on). Tracked as **TA-135**, bundled with the `pypdf` work above since both need the same kind of full regression pass. Two Dependabot PRs (#145, #146) already hit this exact fastapi/starlette version coupling independently and had to be closed — see TA-135 for why. |
| `bcrypt` | none found | — | Explicitly reviewed per the ticket. No known vulnerability at 4.0.1. Held back from newer releases deliberately for `passlib` 1.7.4 compatibility (see comment in `backend/requirements.txt`), not out of neglect. |
| `@vitest/mocker` (transitive, via `vitest`, dev-only) | GHSA-82fw-gwwq-j7x9 | Moderate | Path traversal / arbitrary file read via a redirected mock. Below the `--audit-level=high` threshold already. Dev/test tooling only, never shipped or run against attacker input. The fix (`vitest@5.0.1`) is a breaking major-version bump that would need re-validating TA-126's freshly-set coverage thresholds and config — not worth doing as a drive-by here. Revisit alongside the next vitest upgrade. |

## Adding a new accepted risk

1. Add the package/ID/severity/reason to the table above.
2. Add the matching ID(s) to `.github/pip-audit-ignore.txt` (with a comment explaining why).
3. Add a short comment next to the relevant pin in `backend/requirements.txt` (or `frontend/package.json`) so the reasoning is visible from the file that will eventually need to change.
