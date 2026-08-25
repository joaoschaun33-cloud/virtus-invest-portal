import { describe, expect, it } from "vitest";
import { calculateValuation } from "./valuation";

describe("educational valuation", () => {
  it("calculates Graham, Bazin, checklist and PEG from valid inputs", () => {
    const result = calculateValuation({
      price: 20,
      bookValuePerShare: 12,
      earningsPerShare: 2,
      pe: 10,
      dividendPerShare: 1.4,
      earningsGrowth: 12,
      roe: 18,
      netMargin: 14,
      netDebtEbitda: 1.5,
      growingProfitFiveYears: true,
    });
    expect(result.grahamPrice).toBeCloseTo(Math.sqrt(540));
    expect(result.bazinPrice).toBeCloseTo(23.3333);
    expect(result.dividendYield).toBeCloseTo(7);
    expect(result.peg).toBeCloseTo(10 / 12);
    expect(result.score).toBe(4);
    expect(result.evaluated).toBe(4);
  });

  it("returns undefined results rather than inventing missing values", () => {
    const result = calculateValuation({
      price: 20,
      bookValuePerShare: 0,
      earningsPerShare: 0,
      pe: null,
      dividendPerShare: 0,
      earningsGrowth: 0,
      roe: null,
      netMargin: null,
      netDebtEbitda: null,
      growingProfitFiveYears: null,
    });
    expect(result.grahamPrice).toBeNull();
    expect(result.bazinPrice).toBeNull();
    expect(result.peg).toBeNull();
    expect(result.evaluated).toBe(0);
  });
});
