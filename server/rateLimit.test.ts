import { describe, expect, it } from "vitest";
import { FixedWindowRateLimiter } from "./rateLimit";

describe("FixedWindowRateLimiter", () => {
  it("blocks requests above the limit and reports remaining capacity", () => {
    const limiter = new FixedWindowRateLimiter(2, 1_000);
    expect(limiter.consume("client", 100).allowed).toBe(true);
    expect(limiter.consume("client", 200).remaining).toBe(0);
    expect(limiter.consume("client", 300).allowed).toBe(false);
  });

  it("resets the bucket after the configured window", () => {
    const limiter = new FixedWindowRateLimiter(1, 1_000);
    limiter.consume("client", 100);
    expect(limiter.consume("client", 500).allowed).toBe(false);
    expect(limiter.consume("client", 1_100).allowed).toBe(true);
  });

  it("isolates clients", () => {
    const limiter = new FixedWindowRateLimiter(1, 1_000);
    expect(limiter.consume("a", 100).allowed).toBe(true);
    expect(limiter.consume("b", 100).allowed).toBe(true);
  });
});
