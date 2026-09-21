import { describe, it, expect } from "vitest";
import { STATUS_MAP } from "@/lib/document-adapter";
import backendStatusEnum from "./fixtures/backend-status-enum.json";

/**
 * TA-123 (contract tests): STATUS_MAP is typed as
 * Record<BackendDocumentStatus, ComplianceStatus>, so TypeScript
 * already forces its keys to match BackendDocumentStatus exactly --
 * but BackendDocumentStatus (in lib/documents-api.ts) is itself a
 * hand-typed union with nothing checking it still matches the real
 * backend enum. This is the frontend half of that check.
 *
 * backend-status-enum.json is generated from the LIVE backend OpenAPI
 * schema (scripts/export_contract_fixtures.py), not hand-typed --
 * backend/tests/test_contract_status_enum.py asserts the same file
 * still matches that live schema. Together, the two tests form one
 * chain: STATUS_MAP === fixture === live backend enum.
 */
describe("STATUS_MAP contract with the backend DocumentStatus enum", () => {
  it("has exactly the same status values as the backend, sorted", () => {
    const frontendStatuses = Object.keys(STATUS_MAP).sort();
    expect(frontendStatuses).toEqual(backendStatusEnum);
  });

  it("fails loudly (not silently) if the backend adds a status STATUS_MAP doesn't know about", () => {
    // Guards against the exact bug shape document-adapter.ts's
    // STATUS_MAP[doc.status] ?? "pending" fallback would otherwise
    // hide: an unmapped backend status silently becoming "pending"
    // instead of surfacing anywhere. If this test ever needs to be
    // updated, it means STATUS_MAP itself needs a new entry too.
    for (const status of backendStatusEnum) {
      expect(STATUS_MAP).toHaveProperty(status);
    }
  });
});
