import { describe, expect, it } from "vitest";
import { deriveFinancialMetrics } from "./financialMetrics";
import type { CvmFinancialStatements } from "./cvmFinancialData";

const statement: CvmFinancialStatements = {
  ticker: "TEST3",
  cnpj: "00.000.000/0001-00",
  cvmCode: "1",
  companyName: "TESTE",
  filing: "ITR",
  referenceDate: "2026-06-30",
  periodStart: "2026-01-01",
  periodEnd: "2026-06-30",
  version: 1,
  currency: "BRL",
  values: { revenue: 200, netIncome: 20, totalAssets: 500, equity: 200 },
  comparatives: { revenue: 160, netIncome: 10, totalAssets: 450, equity: 180 },
  source: "cvm",
  sourceUrl: "https://dados.cvm.gov.br/",
  asOf: "2026-08-19T12:00:00.000Z",
};

describe("Virtus financial metrics", () => {
  it("derives transparent ratios and comparable growth", () => {
    const metrics = deriveFinancialMetrics(statement);
    expect(metrics.find(metric => metric.id === "net-margin")?.value).toBe(10);
    expect(metrics.find(metric => metric.id === "equity-ratio")?.value).toBe(40);
    expect(metrics.find(metric => metric.id === "revenue-growth")?.value).toBe(25);
    expect(metrics.find(metric => metric.id === "annualized-roe")?.value).toBeCloseTo(
      21.22,
      1
    );
    expect(metrics.every(metric => metric.formula && metric.source === "virtus")).toBe(true);
  });

  it("omits ratios whose denominator is unavailable or zero", () => {
    const metrics = deriveFinancialMetrics({
      ...statement,
      values: { revenue: 0, netIncome: 5, totalAssets: null, equity: null },
      comparatives: { revenue: null, netIncome: null, totalAssets: null, equity: null },
    });
    expect(metrics).toEqual([]);
  });
});
