import { describe, expect, it, vi } from "vitest";
import { CircuitBreaker, withRetry } from "./reliability";

describe("reliability primitives", () => {
  it("retries transient failures and eventually succeeds", async () => {
    let attempts = 0;
    const result = await withRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) throw new Error("temporary");
        return "ok";
      },
      { attempts: 3, baseDelayMs: 0 }
    );

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });

  it("stops retrying when the predicate rejects the error", async () => {
    const operation = vi.fn(async () => {
      throw new Error("permanent");
    });

    await expect(
      withRetry(operation, {
        attempts: 3,
        baseDelayMs: 0,
        shouldRetry: () => false,
      })
    ).rejects.toThrow("permanent");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("opens after the failure threshold and resets after the timeout", async () => {
    vi.useFakeTimers();
    try {
      const breaker = new CircuitBreaker("test", 2, 1_000);
      const failure = async () => {
        throw new Error("downstream");
      };

      await expect(breaker.exec(failure)).rejects.toThrow("downstream");
      await expect(breaker.exec(failure)).rejects.toThrow("downstream");
      await expect(breaker.exec(failure)).rejects.toThrow("Circuit open: test");

      vi.advanceTimersByTime(1_000);
      await expect(breaker.exec(async () => "recovered")).resolves.toBe("recovered");
    } finally {
      vi.useRealTimers();
    }
  });
});
