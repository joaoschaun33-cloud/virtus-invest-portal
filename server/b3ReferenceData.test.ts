import { describe, expect, it } from "vitest";
import { findB3IssuerInText } from "./b3ReferenceData";

describe("B3 issuer reference data", () => {
  const rows = [
    '"ITUB","ITAU UNIBANCO HOLDING SA","60872504000123","20180628"',
    '"PETR","PETROLEO BRASILEIRO SA PETROBRAS","33000167000101","20180628"',
  ].join("\n");

  it("maps a stock ticker to an official issuer identity", () => {
    expect(
      findB3IssuerInText(rows, "PETR4", "STOCK", "2026-08-19T08:00:00-03:00")
    ).toMatchObject({
      ticker: "PETR4",
      issuerCode: "PETR",
      cnpj: "33.000.167/0001-01",
      source: "b3",
    });
  });

  it("does not infer identities for non-company instruments", () => {
    expect(findB3IssuerInText(rows, "IVVB11", "ETF")).toBeNull();
  });
});
