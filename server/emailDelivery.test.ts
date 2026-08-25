import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

import {
  clearEmailDeliveriesForTests,
  markEmailDeliveryFailed,
  markEmailDeliverySent,
  reserveEmailDelivery,
  cleanupExpiredEmailDeliveries,
} from "./emailDelivery";

describe("email delivery idempotency", () => {
  beforeEach(() => clearEmailDeliveriesForTests());

  it("reserves a key once and rejects repeated delivery", async () => {
    expect(await reserveEmailDelivery("alert-1")).toBe(true);
    expect(await reserveEmailDelivery("alert-1")).toBe(false);

    await markEmailDeliverySent("alert-1");
    expect(await reserveEmailDelivery("alert-1")).toBe(false);
  });

  it("allows a failed delivery to be retried", async () => {
    expect(await reserveEmailDelivery("alert-2")).toBe(true);
    await markEmailDeliveryFailed("alert-2", new Error("timeout"));
    expect(await reserveEmailDelivery("alert-2")).toBe(true);
  });

  it("cleans up expired local delivery records", async () => {
    expect(await reserveEmailDelivery("alert-3")).toBe(true);
    await markEmailDeliveryFailed("alert-3", new Error("timeout"));
    expect(await cleanupExpiredEmailDeliveries()).toBe(1);
    expect(await reserveEmailDelivery("alert-3")).toBe(true);
  });
});
