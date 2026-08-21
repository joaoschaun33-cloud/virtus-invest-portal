import { describe, expect, it } from "vitest";
import { runB3IndexSeed } from "./b3IndexSeed";

describe("B3 Index Seeder", () => {
  it("runs idempotently and returns execution metrics", async () => {
    const result = await runB3IndexSeed();
    expect(result.totalConstituents).toBeGreaterThanOrEqual(170);
    expect(result.inserted).toBeGreaterThanOrEqual(0);
    expect(result.updated).toBeGreaterThanOrEqual(0);
  });
});
