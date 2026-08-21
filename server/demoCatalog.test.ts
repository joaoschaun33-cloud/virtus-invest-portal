import { describe, expect, it } from "vitest";
import { listDemoCatalogAssets } from "./db";

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
});
