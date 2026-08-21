import { describe, expect, it } from "vitest";
import { fetchTreasuryOverview } from "./treasuryData";

describe("Treasury Data Provider", () => {
  it(
    "fetches Brazilian government bonds with Selic, IPCA and Prefixado categories",
    { timeout: 60_000 },
    async () => {
    const overview = await fetchTreasuryOverview();
    expect(overview.selicRate).toBeGreaterThan(0);
    expect(overview.cdiRate).toBeGreaterThan(0);
    expect(overview.ipca12m).toBeGreaterThan(0);
    expect(overview.bonds.length).toBeGreaterThanOrEqual(5);

    const selicBond = overview.bonds.find(b => b.category === "SELIC");
    const ipcaBond = overview.bonds.find(b => b.category === "IPCA");
    const preBond = overview.bonds.find(b => b.category === "PREFIXADO");

    expect(selicBond).toBeDefined();
    expect(ipcaBond).toBeDefined();
    expect(preBond).toBeDefined();
    expect(overview.source).toBe("tesouro-direto");
  });
});
