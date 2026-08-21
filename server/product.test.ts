import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("produto Apex", () => {
  it("calcula juros compostos com aportes mensais", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.portfolio.compoundInterest({ initial: 1000, monthly: 100, annualRate: 12, years: 1 });
    expect(result).toHaveLength(13);
    expect(result[0]).toMatchObject({ month: 0, balance: 1000, contributed: 1000 });
    expect(result.at(-1)?.contributed).toBe(2200);
    expect(result.at(-1)?.balance).toBeGreaterThan(result.at(-1)?.contributed ?? 0);
  });

  it("expõe o estado das três fontes de dados", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const status = await caller.market.providerStatus();
    expect(status).toEqual(expect.objectContaining({ brapi: expect.any(Boolean), twelveData: expect.any(Boolean), finnhub: expect.any(Boolean) }));
  });

  it("rejeita mais de quatro ativos no comparador", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.market.compare({ tickers: ["PETR4", "VALE3", "ITUB4", "BTC/USD", "SPX"] })).rejects.toThrow();
  });
});
