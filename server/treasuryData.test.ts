import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./macroData", () => ({
  getMacroBrief: vi.fn(async () => ({
    indicators: [
      { id: "selic", value: 10.5 },
      { id: "ipca12m", value: 4.2 },
    ],
  })),
}));

import { fetchTreasuryOverview } from "./treasuryData";

const csv = [
  "Tipo Titulo;Data Vencimento;Data Base;Taxa Venda Manha;PU Venda Manha",
  "Tesouro Selic;01/03/2029;25/08/2026;0,12;15000,00",
  "Tesouro Selic;01/03/2031;25/08/2026;0,15;14000,00",
  "Tesouro IPCA+;15/05/2035;25/08/2026;6,20;3200,00",
  "Tesouro IPCA+;15/08/2040;25/08/2026;6,10;2800,00",
  "Tesouro Prefixado;01/01/2029;25/08/2026;12,50;780,00",
].join("\n");

describe("Treasury Data Provider", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(new TextEncoder().encode(csv), { status: 200 })
      )
    );
  });

  it("normalizes official bonds with deterministic macro inputs", async () => {
    const overview = await fetchTreasuryOverview();
    expect(overview.selicRate).toBe(10.5);
    expect(overview.cdiRate).toBe(10.4);
    expect(overview.ipca12m).toBe(4.2);
    expect(overview.bonds).toHaveLength(5);
    expect(new Set(overview.bonds.map(bond => bond.category))).toEqual(
      new Set(["SELIC", "IPCA", "PREFIXADO"])
    );
    expect(overview.source).toBe("tesouro-direto");
  });
});
