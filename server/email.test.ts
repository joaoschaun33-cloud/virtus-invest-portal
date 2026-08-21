import { describe, expect, it } from "vitest";

describe("Resend email configuration", () => {
  const hasEmailConfiguration = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);

  it.skipIf(!hasEmailConfiguration)("accepts the configured API key on a lightweight account request", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    expect(apiKey, "RESEND_API_KEY is required for email validation").toBeTruthy();
    expect(from, "RESEND_FROM_EMAIL is required for email validation").toBeTruthy();
    expect(from).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);

    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(response.status).toBeLessThan(500);
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
  }, 10000);
});
