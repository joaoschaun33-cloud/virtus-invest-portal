import { describe, expect, it, vi } from "vitest";
import { runCvmFinancialIngestion } from "./cvmFinancialIngestion";
import type { CvmFinancialStatements } from "./cvmFinancialData";

const statement = {
  ticker: "PETR4",
  cnpj: "33.000.167/0001-01",
  values: {},
} as CvmFinancialStatements;

describe("scheduled CVM ingestion", () => {
  it("downloads a single batch and persists each identified issuer", async () => {
    const fetchBatch = vi.fn(async () => new Map([[statement.cnpj, statement]]));
    const save = vi.fn(async () => undefined);
    const result = await runCvmFinancialIngestion(
      { limit: 10 },
      {
        listTargets: vi.fn(async () => [
          { id: 1, ticker: "PETR4", assetType: "STOCK" },
          { id: 2, ticker: "SEM3", assetType: "STOCK" },
        ]) as never,
        identifyIssuer: vi.fn(async ticker =>
          ticker === "PETR4" ? ({ cnpj: statement.cnpj } as never) : null
        ),
        fetchBatch,
        save,
      }
    );
    expect(fetchBatch).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(1, statement);
    expect(result).toMatchObject({ scanned: 2, identified: 1, saved: 1 });
  });

  it("reports missing statements without saving fabricated data", async () => {
    const save = vi.fn(async () => undefined);
    const result = await runCvmFinancialIngestion(
      {},
      {
        listTargets: vi.fn(async () => [
          { id: 1, ticker: "PETR4", assetType: "STOCK" },
        ]) as never,
        identifyIssuer: vi.fn(async () => ({ cnpj: statement.cnpj }) as never),
        fetchBatch: vi.fn(async () => new Map()),
        save,
      }
    );
    expect(save).not.toHaveBeenCalled();
    expect(result.failures).toEqual(["PETR4"]);
  });
});
