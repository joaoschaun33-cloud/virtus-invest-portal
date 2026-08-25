import { afterEach, describe, expect, it } from "vitest";
import {
  clearDbForTests,
  getAssetByTicker,
  listAssets,
  listDemoCatalogAssets,
} from "./db";

const originalNodeEnv = process.env.NODE_ENV;
const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  clearDbForTests();
});

describe("demo market catalog", () => {
  it("keeps a useful market overview available without a database", () => {
    const rows = listDemoCatalogAssets();
    expect(rows.some(asset => asset.ticker === "IBOV")).toBe(true);
    expect(rows.some(asset => asset.ticker === "PETR4")).toBe(true);
    expect(rows.every(asset => asset.source === "catalog")).toBe(true);
  });

  it("supports the same search and type filters as the database catalog", () => {
    expect(
      listDemoCatalogAssets({ search: "petr" }).map(asset => asset.ticker)
    ).toEqual(["PETR4"]);
    expect(
      listDemoCatalogAssets({ assetType: "REIT" }).map(asset => asset.ticker)
    ).toEqual(["HGLG11", "KNRI11", "MXRF11", "XPML11", "BTLG11"]);
  });

  it("never exposes the demo catalog when the production database is unavailable", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.DATABASE_URL;
    clearDbForTests();

    await expect(listAssets()).resolves.toEqual([]);
    await expect(getAssetByTicker("PETR4")).resolves.toBeUndefined();
  });
});
