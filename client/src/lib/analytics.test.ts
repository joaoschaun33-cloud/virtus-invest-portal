import { beforeEach, describe, expect, it, vi } from "vitest";
import { trackProductEvent } from "./analytics";

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
  });
  vi.stubGlobal("window", { gtag: vi.fn() });
});

describe("trackProductEvent", () => {
  it("does not emit without analytics consent", () => {
    expect(trackProductEvent("analysis_search", { ticker: "PETR4" })).toBe(false);
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it("emits an allowlisted product event after consent", () => {
    storage.set("virtus-cookie-consent-v1", "analytics");
    expect(trackProductEvent("guide_goal_selected", { goal: "investir" })).toBe(true);
    expect(window.gtag).toHaveBeenCalledWith("event", "guide_goal_selected", {
      goal: "investir",
    });
  });

  it("drops parameters outside the event privacy allowlist", () => {
    storage.set("virtus-cookie-consent-v1", "analytics");
    trackProductEvent("portfolio_exported", { format: "csv", position_count: 3, total_value: 99999 });
    expect(window.gtag).toHaveBeenCalledWith("event", "portfolio_exported", { format: "csv", position_count: 3 });
  });
});
