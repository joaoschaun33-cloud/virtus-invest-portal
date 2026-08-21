import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { validateManualTransaction } from "./routers/portfolio";
import {
  applyWatchlistChange,
  estimateDividendIncome,
  summarizePortfolioPerformance,
  summarizePortfolioRows,
} from "./portfolioLogic";

describe("validateManualTransaction", () => {
  it("rejects a ticker that is not in the catalog with NOT_FOUND", () => {
    try {
      validateManualTransaction(
        { transactionType: "BUY", quantity: 1, transactionDate: "2026-08-15" },
        { assetExists: false }
      );
      throw new Error("expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("NOT_FOUND");
      expect((error as TRPCError).message).toMatch(/Ativo não encontrado/);
    }
  });

  it("rejects an invalid transaction date with BAD_REQUEST", () => {
    try {
      validateManualTransaction(
        { transactionType: "BUY", quantity: 1, transactionDate: "not-a-date" },
        { assetExists: true }
      );
      throw new Error("expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("BAD_REQUEST");
      expect((error as TRPCError).message).toMatch(/data válida/);
    }
  });

  it("rejects a sale above the manually tracked position with BAD_REQUEST", () => {
    try {
      validateManualTransaction(
        {
          transactionType: "SELL",
          quantity: 101,
          transactionDate: "2026-08-15",
        },
        { assetExists: true, availableQuantity: 100 }
      );
      throw new Error("expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("BAD_REQUEST");
      expect((error as TRPCError).message).toMatch(/não pode exceder/);
    }
  });

  it("returns a Date for a valid buy", () => {
    const result = validateManualTransaction(
      { transactionType: "BUY", quantity: 10, transactionDate: "2026-08-15" },
      { assetExists: true }
    );
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toContain("2026-08-15");
  });
});

describe("watchlist and portfolio logic", () => {
  it("adds idempotently, removes, and keeps an empty watchlist stable", () => {
    expect(applyWatchlistChange([], 7, "add")).toEqual([7]);
    expect(applyWatchlistChange([7], 7, "add")).toEqual([7]);
    expect(applyWatchlistChange([7, 11], 7, "remove")).toEqual([11]);
    expect(applyWatchlistChange([], 7, "remove")).toEqual([]);
  });

  it("consolidates buys and sells using average cost and current price", () => {
    const asset = { id: 1, ticker: "PETR4", lastPrice: "40" };
    const summary = summarizePortfolioRows([
      {
        asset,
        transaction: {
          transactionType: "BUY",
          quantity: "10",
          unitPrice: "30",
          fees: "0",
        },
      },
      {
        asset,
        transaction: {
          transactionType: "BUY",
          quantity: "10",
          unitPrice: "50",
          fees: "10",
        },
      },
      {
        asset,
        transaction: {
          transactionType: "SELL",
          quantity: "5",
          unitPrice: "45",
          fees: "0",
        },
      },
    ]);

    expect(summary).toHaveLength(1);
    expect(summary[0]).toMatchObject({
      quantity: 15,
      invested: 607.5,
      currentValue: 600,
      profit: -7.5,
    });
    expect(summary[0]?.returnPercent).toBeCloseTo(-1.2346, 3);
  });

  it("returns no consolidated positions for an empty or fully sold ledger", () => {
    const asset = { id: 1, ticker: "PETR4", lastPrice: "40" };
    expect(summarizePortfolioRows([])).toEqual([]);
    expect(
      summarizePortfolioRows([
        {
          asset,
          transaction: {
            transactionType: "BUY",
            quantity: "5",
            unitPrice: "30",
            fees: "0",
          },
        },
        {
          asset,
          transaction: {
            transactionType: "SELL",
            quantity: "5",
            unitPrice: "40",
            fees: "0",
          },
        },
      ])
    ).toEqual([]);
  });

  it("keeps realized result separate from the value of remaining positions", () => {
    const asset = { id: 1, ticker: "PETR4", lastPrice: "40" };
    const performance = summarizePortfolioPerformance([
      {
        asset,
        transaction: {
          id: 1,
          transactionDate: "2026-01-10",
          transactionType: "BUY",
          quantity: "10",
          unitPrice: "30",
          fees: "10",
        },
      },
      {
        asset,
        transaction: {
          id: 2,
          transactionDate: "2026-02-10",
          transactionType: "SELL",
          quantity: "4",
          unitPrice: "40",
          fees: "2",
        },
      },
    ]);

    expect(performance.realizedProfit).toBeCloseTo(34, 5);
    expect(performance.positions[0]).toMatchObject({
      quantity: 6,
      invested: 186,
      currentValue: 240,
      realizedProfit: 34,
    });
  });

  it("estimates gross dividends from the manual position held on the event date", () => {
    const asset = { id: 1, ticker: "PETR4", lastPrice: "40" };
    const income = estimateDividendIncome(
      [
        {
          asset,
          transaction: {
            id: 1,
            transactionDate: "2026-01-10",
            transactionType: "BUY",
            quantity: "10",
            unitPrice: "30",
            fees: "0",
          },
        },
        {
          asset,
          transaction: {
            id: 2,
            transactionDate: "2026-03-10",
            transactionType: "SELL",
            quantity: "3",
            unitPrice: "40",
            fees: "0",
          },
        },
      ],
      [
        {
          asset,
          dividend: {
            id: 1,
            eventDate: "2026-02-15",
            amountPerShare: "0.50",
            kind: "DIVIDEND",
            sourceName: "catalog",
          },
        },
        {
          asset,
          dividend: {
            id: 2,
            eventDate: "2026-04-15",
            amountPerShare: "1.00",
            kind: "DIVIDEND",
            sourceName: "catalog",
          },
        },
      ]
    );

    expect(income).toHaveLength(2);
    expect(income.map(item => item.estimatedGrossIncome)).toEqual([7, 5]);
  });
});
