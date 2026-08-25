import { describe, expect, it } from "vitest";
import { runB3IndexSeed } from "./b3IndexSeed";

const constituents = Array.from({ length: 2 }, (_, index) => ({
  ticker: `TEST${index + 3}`,
  name: `Teste ${index}`,
  assetType: "STOCK" as const,
  exchange: "B3" as const,
  currency: "BRL" as const,
  sector: null,
  index: "IBOV" as const,
}));

describe("B3 Index Seeder", () => {
  it("runs idempotently and returns execution metrics", async () => {
    const result = await runB3IndexSeed({ constituents, referenceDate: "2026-08-25" });
    expect(result.totalConstituents).toBe(2);
    expect(result.inserted).toBeGreaterThanOrEqual(0);
    expect(result.updated).toBeGreaterThanOrEqual(0);
    expect(result.referenceDate).toBe("2026-08-25");
  });
});
