import { afterEach, describe, expect, it } from "vitest";
import { getDataSourceGovernance, marketSourceOrder } from "./dataSourcePolicy";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe("data source governance", () => {
  it("prioritizes brapi for B3 market data", () => {
    process.env.BRAPI_API_KEY = "configured";
    expect(marketSourceOrder("quote", { assetType: "STOCK" })[0]).toBe("brapi");
  });

  it("blocks license-review providers from public display by default", () => {
    process.env.TWELVE_DATA_API_KEY = "configured";
    process.env.FINNHUB_API_KEY = "configured";
    delete process.env.TWELVE_DATA_PUBLIC_DISPLAY;
    delete process.env.FINNHUB_PUBLIC_DISPLAY;
    expect(marketSourceOrder("quote", { assetType: "FOREX" })).toEqual([]);
  });

  it("allows a provider only after explicit public-display approval", () => {
    process.env.TWELVE_DATA_API_KEY = "configured";
    process.env.TWELVE_DATA_PUBLIC_DISPLAY = "true";
    expect(marketSourceOrder("history", { assetType: "FOREX" })[0]).toBe(
      "twelve-data"
    );
  });

  it("prioritizes CoinGecko for crypto and gates EODHD public display", () => {
    process.env.COINGECKO_API_KEY = "configured";
    process.env.COINGECKO_PUBLIC_DISPLAY = "true";
    process.env.EODHD_API_TOKEN = "configured";
    delete process.env.EODHD_PUBLIC_DISPLAY;
    expect(marketSourceOrder("quote", { assetType: "CRYPTO" })[0]).toBe(
      "coingecko"
    );
    expect(marketSourceOrder("quote", { assetType: "STOCK" })).not.toContain(
      "eodhd"
    );
    process.env.EODHD_PUBLIC_DISPLAY = "true";
    expect(marketSourceOrder("history", { assetType: "STOCK" })).toContain(
      "eodhd"
    );
  });

  it("exposes governance without exposing credentials", () => {
    process.env.BRAPI_API_KEY = "super-secret";
    const payload = getDataSourceGovernance();
    expect(payload.find(source => source.id === "bcb")?.authority).toBe(
      "authoritative"
    );
    expect(JSON.stringify(payload)).not.toContain("super-secret");
  });
});
