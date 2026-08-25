import { describe, expect, it } from "vitest";
import { parseB3CotahistLine, parseB3CotahistText } from "./b3Cotahist";

function cotahistLine(overrides: Record<number, string> = {}) {
  const chars = Array.from({ length: 245 }, () => " ");
  const write = (start: number, length: number, value: string) => {
    const padded = value.padEnd(length, " ").slice(0, length);
    for (let index = 0; index < length; index += 1)
      chars[start - 1 + index] = padded[index];
  };
  write(1, 2, "01");
  write(3, 8, "20260821");
  write(11, 2, "02");
  write(13, 12, "PETR4");
  write(25, 3, "010");
  write(28, 12, "PETROBRAS");
  write(53, 4, "R$");
  write(57, 13, "0000000003850");
  write(70, 13, "0000000003920");
  write(83, 13, "0000000003810");
  write(109, 13, "0000000003900");
  write(153, 18, "000000000072000000");
  for (const [start, value] of Object.entries(overrides))
    write(Number(start), value.length, value);
  return chars.join("");
}

describe("B3 COTAHIST", () => {
  it("parses an official fixed-width spot-market record", () => {
    expect(parseB3CotahistLine(cotahistLine())).toEqual({
      ticker: "PETR4",
      name: "PETROBRAS",
      tradingDate: "2026-08-21",
      currency: "BRL",
      open: 38.5,
      high: 39.2,
      low: 38.1,
      close: 39,
      volume: 72_000_000,
      source: "b3",
    });
  });

  it("rejects header, non-spot and unsupported BDI records", () => {
    expect(parseB3CotahistLine("00COTAHIST")).toBeNull();
    expect(parseB3CotahistLine(cotahistLine({ 25: "020" }))).toBeNull();
    expect(parseB3CotahistLine(cotahistLine({ 11: "96" }))).toBeNull();
  });

  it("deduplicates tickers in a daily file", () => {
    const first = cotahistLine();
    const last = cotahistLine({ 109: "0000000004000" });
    expect(parseB3CotahistText(`${first}\r\n${last}`)).toMatchObject([
      { ticker: "PETR4", close: 40 },
    ]);
  });
});
