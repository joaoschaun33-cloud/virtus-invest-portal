import { describe, expect, it } from "vitest";
import { getProviderStatus, PROVIDER_COVERAGE } from "./marketProviders";

describe("market provider configuration", () => {
  it("reports the availability of all three provider credentials", () => {
    const status = getProviderStatus();
    expect(status).toEqual(expect.objectContaining({ brapi: expect.any(Boolean), twelveData: expect.any(Boolean), finnhub: expect.any(Boolean) }));
  });

  it("does not expose credential values through the public status", () => {
    const status = getProviderStatus();
    expect(Object.keys(status).sort()).toEqual(["brapi", "finnhub", "resend", "twelveData"].sort());
    expect(JSON.stringify(status)).not.toMatch(/apikey|token|secret/i);
  });

  it("documents the source-of-truth coverage without claiming unsupported editorial feeds", () => {
    expect(PROVIDER_COVERAGE.brapi).toEqual({ quotes: true, history: true, fundamentals: true, news: false, calendar: false });
    expect(PROVIDER_COVERAGE["twelve-data"]).toEqual({ quotes: true, history: true, fundamentals: true, news: true, calendar: false });
    expect(PROVIDER_COVERAGE.finnhub).toEqual({ quotes: true, history: true, fundamentals: true, news: true, calendar: true });
  });
});
