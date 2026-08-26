import { describe, expect, it } from "vitest";
import { parseB3IndexDailyEvolution } from "./b3OfficialIndex";

describe("B3 official index daily evolution", () => {
  it("selects the latest close and calculates change from the prior session", () => {
    const results = Array.from({ length: 31 }, (_, index) => ({ day: index + 1 }));
    Object.assign(results[23], { rateValue8: "171.906,72" });
    Object.assign(results[24], { rateValue8: "174.576,80" });
    const parsed = parseB3IndexDailyEvolution(
      { results }, 2026, "https://b3.example/index", new Date("2026-08-25T23:00:00Z")
    );
    expect(parsed).toMatchObject({
      ticker: "IBOV",
      tradingDate: "2026-08-25",
      close: 174576.8,
      previousClose: 171906.72,
      source: "b3",
    });
    expect(parsed.changePercent).toBeCloseTo(1.5532, 4);
  });

  it("does not accept values beyond the requested reference date", () => {
    const results = Array.from({ length: 31 }, (_, index) => ({ day: index + 1 }));
    Object.assign(results[23], { rateValue8: "171.906,72" });
    Object.assign(results[24], { rateValue8: "174.576,80" });
    Object.assign(results[25], { rateValue8: "999.999,99" });
    const parsed = parseB3IndexDailyEvolution(
      { results }, 2026, undefined, new Date("2026-08-25T23:00:00Z")
    );
    expect(parsed.tradingDate).toBe("2026-08-25");
    expect(parsed.close).toBe(174576.8);
  });
});
