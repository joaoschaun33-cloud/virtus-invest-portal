import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordConsentedBetaSession, retentionBucket } from "./retentionMetrics";

const local = new Map<string, string>();
const session = new Map<string, string>();

beforeEach(() => {
  local.clear(); session.clear();
  vi.stubGlobal("localStorage", { getItem: (key: string) => local.get(key) ?? null, setItem: (key: string, value: string) => local.set(key, value) });
  vi.stubGlobal("sessionStorage", { getItem: (key: string) => session.get(key) ?? null, setItem: (key: string, value: string) => session.set(key, value) });
  vi.stubGlobal("window", { gtag: vi.fn() });
});

describe("beta retention metrics", () => {
  it("classifies the D1, D7 and D30 return windows", () => {
    const first = new Date("2026-08-01T12:00:00Z");
    expect(retentionBucket(first, new Date("2026-08-02T12:00:00Z"))).toBe("D1");
    expect(retentionBucket(first, new Date("2026-08-08T12:00:00Z"))).toBe("D7-D29");
    expect(retentionBucket(first, new Date("2026-08-31T12:00:00Z"))).toBe("D30+");
  });

  it("emits only one anonymous beta session per browser session", () => {
    expect(recordConsentedBetaSession(new Date("2026-08-28T12:00:00Z"))).toBe(true);
    expect(recordConsentedBetaSession(new Date("2026-08-28T13:00:00Z"))).toBe(false);
    expect(window.gtag).toHaveBeenCalledTimes(1);
    expect(window.gtag).toHaveBeenCalledWith("event", "beta_session", { retention_bucket: "D0" });
  });
});
