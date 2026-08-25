import { describe, expect, it } from "vitest";
import { parseB3OfficialPortfolio } from "./b3OfficialPortfolio";

describe("official B3 portfolio", () => {
  it("validates and normalizes the current composition", () => {
    const results = Array.from({ length: 78 }, (_, index) => ({
      cod: `A${String(index).padStart(3, "0")}`,
      asset: `Empresa ${index}`,
    }));
    const portfolio = parseB3OfficialPortfolio("IBOV", {
      header: { date: "25/08/26" },
      page: { totalRecords: 78 },
      results,
    });
    expect(portfolio.referenceDate).toBe("2026-08-25");
    expect(portfolio.constituents).toHaveLength(78);
    expect(portfolio.constituents[0].assetType).toBe("STOCK");
  });

  it("rejects truncated responses", () => {
    expect(() =>
      parseB3OfficialPortfolio("IFIX", {
        header: { date: "25/08/26" },
        page: { totalRecords: 106 },
        results: [],
      })
    ).toThrow(/incompleta/);
  });
});
