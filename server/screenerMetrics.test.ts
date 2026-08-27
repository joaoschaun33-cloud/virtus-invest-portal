import { describe, expect, it } from "vitest";
import {
  compareNullableMetrics,
  matchesMaximum,
  matchesMinimum,
  metricNumber,
} from "./screenerMetrics";

describe("screener metric integrity", () => {
  it("preserves missing values instead of converting them to zero", () => {
    expect(metricNumber(null)).toBeNull();
    expect(metricNumber(undefined)).toBeNull();
    expect(metricNumber(0)).toBe(0);
  });

  it("does not include missing metrics when a limit is active", () => {
    expect(matchesMinimum(null, 5)).toBe(false);
    expect(matchesMaximum(null, 20)).toBe(false);
    expect(matchesMinimum(null)).toBe(true);
  });

  it("always sorts missing metrics after available values", () => {
    expect(compareNullableMetrics(null, 10, "asc")).toBeGreaterThan(0);
    expect(compareNullableMetrics(null, 10, "desc")).toBeGreaterThan(0);
  });
});
