import { describe, expect, it } from "vitest";
import { shouldAppendConsentRecord } from "./privacyConsent";

describe("privacy consent ledger", () => {
  it("does not duplicate the same choice and policy version", () => {
    expect(shouldAppendConsentRecord({ value: "analytics", policyVersion: "2026-08-25" }, { value: "analytics", policyVersion: "2026-08-25" })).toBe(false);
  });

  it("appends revocation and policy-version changes", () => {
    expect(shouldAppendConsentRecord({ value: "analytics", policyVersion: "2026-08-25" }, { value: "necessary", policyVersion: "2026-08-25" })).toBe(true);
    expect(shouldAppendConsentRecord({ value: "necessary", policyVersion: "2026-08-25" }, { value: "necessary", policyVersion: "2026-09-01" })).toBe(true);
  });
});
