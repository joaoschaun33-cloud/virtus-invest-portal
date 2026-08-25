import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { authorizeJobRequest, matchesJobSecret } from "./jobAuth";

describe("scheduled job authentication", () => {
  it("accepts only the exact configured secret", () => {
    expect(matchesJobSecret("secret-value", "secret-value")).toBe(true);
    expect(matchesJobSecret("wrong-value!", "secret-value")).toBe(false);
  });

  it("fails closed when either side is missing", () => {
    expect(matchesJobSecret(undefined, "secret-value")).toBe(false);
    expect(matchesJobSecret("secret-value", undefined)).toBe(false);
  });

  it("keeps the rotated secret as an operational fallback", async () => {
    const previous = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "rotated-secret";
    const request = {
      header: () => "Bearer rotated-secret",
    } as unknown as Request;
    await expect(authorizeJobRequest(request)).resolves.toBe(true);
    process.env.CRON_SECRET = previous;
  });
});
