import { describe, expect, it } from "vitest";
import { formatMarketValue, optionalNumberValue } from "./formatters";

describe("formatMarketValue", () => {
  it("formats indexes as points rather than currency", () => {
    expect(formatMarketValue(174576.8, "INDEX", "BRL")).toBe("174.576,80 pts");
  });

  it("keeps monetary assets in their declared currency", () => {
    expect(formatMarketValue(41.35, "STOCK", "BRL")).toContain("R$");
    expect(formatMarketValue(10.5, "CRYPTO", "USD")).toContain("US$");
  });

  it("does not turn missing numeric data into zero", () => {
    expect(optionalNumberValue(null)).toBeNull();
    expect(optionalNumberValue(undefined)).toBeNull();
    expect(optionalNumberValue(0)).toBe(0);
  });
});
