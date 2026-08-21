import { describe, expect, it } from "vitest";
import { hasLiveQuoteCoverage } from "./marketProviders";

describe("market provider symbol coverage", () => {
  it("marks only catalog instruments with confirmed provider symbols", () => {
    expect(hasLiveQuoteCoverage("PETR4", "STOCK")).toBe(true);
    expect(hasLiveQuoteCoverage("HGLG11", "REIT")).toBe(true);
    expect(hasLiveQuoteCoverage("IVVB11", "ETF")).toBe(true);
    expect(hasLiveQuoteCoverage("IBOV", "INDEX")).toBe(true);
    expect(hasLiveQuoteCoverage("EUR/USD", "FOREX")).toBe(true);
    expect(hasLiveQuoteCoverage("BTC/USD", "CRYPTO")).toBe(true);

    expect(hasLiveQuoteCoverage("SPX", "INDEX")).toBe(false);
    expect(hasLiveQuoteCoverage("IXIC", "INDEX")).toBe(false);
    expect(hasLiveQuoteCoverage("DXY", "INDEX")).toBe(false);
    expect(hasLiveQuoteCoverage("BZ=F", "COMMODITY")).toBe(false);
  });

  it("supports new B3 instruments through brapi without a hard-coded entry", () => {
    expect(hasLiveQuoteCoverage("BBAS3", "STOCK")).toBe(true);
    expect(hasLiveQuoteCoverage("KNRI11", "REIT")).toBe(true);
  });
});
