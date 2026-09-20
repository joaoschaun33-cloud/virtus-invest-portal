import { describe, expect, it } from "vitest";
import { buildYieldCurve } from "./yieldCurveData";
import type { TreasuryBond } from "./treasuryData";

describe("yieldCurveData", () => {
  const sampleBonds: TreasuryBond[] = [
    {
      name: "Tesouro Prefixado 2026",
      category: "PREFIXADO",
      maturityDate: "01/01/2026",
      annualRate: "11,50% a.a.",
      unitPrice: 890.5,
      minInvestment: 8.91,
      source: "tesouro-direto",
      asOf: "2026-09-20T12:00:00Z",
    },
    {
      name: "Tesouro Prefixado 2031",
      category: "PREFIXADO",
      maturityDate: "01/01/2031",
      annualRate: "12,65% a.a.",
      unitPrice: 580.2,
      minInvestment: 5.8,
      source: "tesouro-direto",
      asOf: "2026-09-20T12:00:00Z",
    },
    {
      name: "Tesouro IPCA+ 2029",
      category: "IPCA",
      maturityDate: "15/08/2029",
      annualRate: "IPCA + 6,45%",
      unitPrice: 3200.0,
      minInvestment: 32.0,
      source: "tesouro-direto",
      asOf: "2026-09-20T12:00:00Z",
    },
    {
      name: "Tesouro IPCA+ 2035",
      category: "IPCA",
      maturityDate: "15/05/2035",
      annualRate: "IPCA + 6,70%",
      unitPrice: 2150.0,
      minInvestment: 21.5,
      source: "tesouro-direto",
      asOf: "2026-09-20T12:00:00Z",
    },
    {
      name: "Tesouro Selic 2029",
      category: "SELIC",
      maturityDate: "01/03/2029",
      annualRate: "Selic + 0,12%",
      unitPrice: 15400.0,
      minInvestment: 154.0,
      source: "tesouro-direto",
      asOf: "2026-09-20T12:00:00Z",
    },
  ];

  it("extracts Prefixado and IPCA+ points correctly", () => {
    const curve = buildYieldCurve(sampleBonds, 10.5, 4.2, "2026-09-20T12:00:00Z");
    expect(curve.pointsPrefixado.length).toBe(2);
    expect(curve.pointsIpca.length).toBe(2);
    expect(curve.pointsPrefixado[0].rate).toBe(11.5);
    expect(curve.pointsPrefixado[1].rate).toBe(12.65);
    expect(curve.pointsIpca[0].rate).toBe(6.45);
  });

  it("computes curve slope spread and structure", () => {
    const curve = buildYieldCurve(sampleBonds, 10.5, 4.2, "2026-09-20T12:00:00Z");
    expect(curve.slope).not.toBeNull();
    // 12.65 - 11.50 = 1.15% = 115 bps
    expect(curve.slope?.spreadBps).toBe(115);
    expect(curve.slope?.structure).toBe("INCLINADA");
  });

  it("calculates implied breakeven inflation using Fisher formula", () => {
    const curve = buildYieldCurve(sampleBonds, 10.5, 4.2, "2026-09-20T12:00:00Z");
    expect(curve.breakeven).not.toBeNull();
    // Prefixado ~12.65% vs IPCA ~6.45%
    // (1 + 0.1265) / (1 + 0.0645) - 1 = 1.1265 / 1.0645 - 1 = 0.0582 = 5.82%
    expect(curve.breakeven?.impliedInflation).toBeGreaterThan(4.0);
    expect(curve.breakeven?.cmnTarget).toBe(3.0);
  });

  it("derives equity risk premium against long sovereign real yield", () => {
    const curve = buildYieldCurve(sampleBonds, 10.5, 4.2, "2026-09-20T12:00:00Z");
    expect(curve.erp).not.toBeNull();
    expect(curve.erp?.sovereignRealYield).toBe(6.7);
    expect(curve.erp?.spreadPercent).toBeCloseTo(11.2 - 6.7, 1);
  });

  it("gracefully handles empty bond list", () => {
    const curve = buildYieldCurve([], 10.5, 4.2, "2026-09-20T12:00:00Z");
    expect(curve.pointsPrefixado).toEqual([]);
    expect(curve.pointsIpca).toEqual([]);
    expect(curve.breakeven).toBeNull();
    expect(curve.erp).toBeNull();
  });
});
