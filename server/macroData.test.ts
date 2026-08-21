import { describe, expect, it } from "vitest";
import { parseBcbNumber, parseIbgeIpcaResponse } from "./macroData";

describe("Banco Central macro data", () => {
  it("normalizes the numeric formats used by the SGS API", () => {
    expect(parseBcbNumber("13.90")).toBe(13.9);
    expect(parseBcbNumber("5,2236")).toBe(5.2236);
    expect(parseBcbNumber("indisponível")).toBeNull();
  });
});

describe("IBGE macro data", () => {
  it("extracts the latest official 12-month IPCA value", () => {
    const result = parseIbgeIpcaResponse([
      {
        resultados: [
          {
            series: [{ serie: { "202606": "4.50", "202607": "4.44" } }],
          },
        ],
      },
    ]);
    expect(result).toMatchObject({
      id: "ipca12m",
      value: 4.44,
      source: "ibge",
    });
    expect(result?.asOf.toISOString()).toBe("2026-07-01T12:00:00.000Z");
  });

  it("rejects malformed aggregate responses", () => {
    expect(parseIbgeIpcaResponse({ error: true })).toBeNull();
  });
});
