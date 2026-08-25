import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "./_core/logger";

describe("structured logger", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes JSON with stable operational fields", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    logger.info("test.event", { requestId: "req-1", durationMs: 12 });

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(payload).toMatchObject({
      level: "info",
      service: "virtus",
      message: "test.event",
      requestId: "req-1",
      durationMs: 12,
    });
    expect(payload.timestamp).toEqual(expect.any(String));
  });
});
