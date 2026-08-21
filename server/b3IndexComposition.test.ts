import { describe, expect, it } from "vitest";
import {
  getAllB3IndexConstituents,
  IBOVESPA_CONSTITUENTS,
  IFIX_CONSTITUENTS,
} from "./b3IndexComposition";

describe("B3 Index Composition Provider", () => {
  it("contains complete Ibovespa theoretical portfolio (>= 80 stocks)", () => {
    expect(IBOVESPA_CONSTITUENTS.length).toBeGreaterThanOrEqual(80);
    const petr4 = IBOVESPA_CONSTITUENTS.find(c => c.ticker === "PETR4");
    const vale3 = IBOVESPA_CONSTITUENTS.find(c => c.ticker === "VALE3");
    const itub4 = IBOVESPA_CONSTITUENTS.find(c => c.ticker === "ITUB4");
    const wege3 = IBOVESPA_CONSTITUENTS.find(c => c.ticker === "WEGE3");

    expect(petr4).toBeDefined();
    expect(vale3).toBeDefined();
    expect(itub4).toBeDefined();
    expect(wege3).toBeDefined();
    expect(petr4?.assetType).toBe("STOCK");
  });

  it("contains complete IFIX theoretical portfolio (>= 90 REITs)", () => {
    expect(IFIX_CONSTITUENTS.length).toBeGreaterThanOrEqual(90);
    const hglg11 = IFIX_CONSTITUENTS.find(c => c.ticker === "HGLG11");
    const knri11 = IFIX_CONSTITUENTS.find(c => c.ticker === "KNRI11");
    const mxrf11 = IFIX_CONSTITUENTS.find(c => c.ticker === "MXRF11");
    const xpml11 = IFIX_CONSTITUENTS.find(c => c.ticker === "XPML11");

    expect(hglg11).toBeDefined();
    expect(knri11).toBeDefined();
    expect(mxrf11).toBeDefined();
    expect(xpml11).toBeDefined();
    expect(hglg11?.assetType).toBe("REIT");
  });

  it("produces unique deduplicated constituents with getAllB3IndexConstituents", () => {
    const all = getAllB3IndexConstituents();
    expect(all.length).toBeGreaterThanOrEqual(170);
    const tickers = all.map(c => c.ticker);
    const uniqueTickers = new Set(tickers);
    expect(uniqueTickers.size).toBe(all.length);
  });
});
