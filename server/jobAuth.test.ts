import { describe, expect, it } from "vitest";
import { matchesJobSecret } from "./jobAuth";

describe("scheduled job authentication", () => {
  it("accepts only the exact configured secret", () => {
    expect(matchesJobSecret("secret-value", "secret-value")).toBe(true);
    expect(matchesJobSecret("wrong-value!", "secret-value")).toBe(false);
  });

  it("fails closed when either side is missing", () => {
    expect(matchesJobSecret(undefined, "secret-value")).toBe(false);
    expect(matchesJobSecret("secret-value", undefined)).toBe(false);
  });
});
