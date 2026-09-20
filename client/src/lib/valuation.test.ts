import { describe, expect, it } from "vitest";
import {
  calculateValuation,
  calculateGrahamWithMargin,
  calculateBazinWithTarget,
  calculateReverseDcf,
  calculateDupontAnalysis,
  calculateAltmanZScore,
} from "./valuation";

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

  describe("Graham with margin of safety", () => {
    it("calculates fair value and attractive entry price with custom margin", () => {
      // VPA = 20, LPA = 4 => fair value = sqrt(22.5 * 20 * 4) = sqrt(1800) ~= 42.42
      const result = calculateGrahamWithMargin(20, 4, 30, 25);
      expect(result).not.toBeNull();
      expect(result?.fairValue).toBeCloseTo(42.426, 2);
      // Buy price with 25% margin: 42.426 * 0.75 = 31.82
      expect(result?.buyPriceWithMargin).toBeCloseTo(31.82, 1);
      // Price is 30, which is <= 31.82 => attractive
      expect(result?.isAttractive).toBe(true);
    });

    it("returns null for non-positive values", () => {
      expect(calculateGrahamWithMargin(0, 4, 30)).toBeNull();
      expect(calculateGrahamWithMargin(20, -1, 30)).toBeNull();
    });
  });

  describe("Bazin with target yield", () => {
    it("calculates ceiling price for customized yield requirements", () => {
      // DPA = 3.00, target yield = 8% => Ceiling price = 3.00 / 0.08 = 37.50
      const result = calculateBazinWithTarget(3.0, 35.0, 8.0);
      expect(result).not.toBeNull();
      expect(result?.ceilingPrice).toBe(37.5);
      expect(result?.isBelowCeiling).toBe(true);
    });
  });

  describe("Reverse DCF", () => {
    it("solves for implied annual FCF growth rate", () => {
      // Stock price 50, FCF per share 4.0, WACC 12%, g 3.5%
      const result = calculateReverseDcf(50, 4.0, 12.0, 3.5, 5);
      expect(result).not.toBeNull();
      // Should find a reasonable implied growth rate
      expect(result?.impliedGrowthRate).toBeDefined();
      expect(result?.wacc).toBe(12.0);
    });

    it("returns null when WACC <= terminal growth or inputs invalid", () => {
      expect(calculateReverseDcf(50, 4.0, 3.0, 3.5)).toBeNull();
      expect(calculateReverseDcf(-10, 4.0, 12.0, 3.5)).toBeNull();
      expect(calculateReverseDcf(50, -2.0, 12.0, 3.5)).toBeNull();
    });
  });

  describe("DuPont Analysis", () => {
    it("decomposes ROE into Margin, Turnover and Leverage", () => {
      // Revenue = 1000, Net Income = 100, Assets = 800, Equity = 400
      // Margin = 10%, Asset Turnover = 1.25x, Leverage = 2.0x
      // ROE = 0.10 * 1.25 * 2.0 = 25%
      const result = calculateDupontAnalysis(1000, 100, 800, 400);
      expect(result).not.toBeNull();
      expect(result?.netMargin).toBe(10);
      expect(result?.assetTurnover).toBe(1.25);
      expect(result?.financialLeverage).toBe(2);
      expect(result?.calculatedRoe).toBe(25);
    });

    it("flags risk alerts when leverage is excessive", () => {
      // Assets = 1000, Equity = 200 => Leverage = 5.0x (> 4x)
      const result = calculateDupontAnalysis(1000, 80, 1000, 200);
      expect(result?.riskAlert).toContain("Alavancagem financeira elevada");
    });
  });

  describe("Altman Z-Score (Emerging Market)", () => {
    it("classifies strong balance sheet into Safe zone", () => {
      // Working capital 200, Assets 1000, Equity 600, EBIT 150, Liabilities 400
      const result = calculateAltmanZScore(200, 1000, 600, 150, 600, 400);
      expect(result).not.toBeNull();
      expect(result?.zone).toBe("SAFE");
      expect(result?.score).toBeGreaterThan(2.6);
    });

    it("classifies overleveraged balance sheet into Distress zone", () => {
      // Working capital -50, Assets 1000, Equity 50, EBIT 10, Liabilities 950
      const result = calculateAltmanZScore(-50, 1000, 50, 10, 50, 950);
      expect(result).not.toBeNull();
      expect(result?.zone).toBe("DISTRESS");
      expect(result?.score).toBeLessThan(1.1);
    });
  });
});
