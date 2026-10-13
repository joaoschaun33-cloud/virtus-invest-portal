import { describe, expect, it } from "vitest";
import { getPoolConfig, closeDbPool } from "./db";

describe("MySQL Connection Pool Configuration", () => {
  it("fornece limites padrão seguros e saudáveis para Cloud SQL", () => {
    const config = getPoolConfig();

    expect(config.connectionLimit).toBeGreaterThanOrEqual(2);
    expect(config.maxIdle).toBeLessThanOrEqual(config.connectionLimit);
    expect(config.idleTimeout).toBe(60_000);
    expect(config.enableKeepAlive).toBe(true);
    expect(config.keepAliveInitialDelay).toBe(10_000);
  });

  it("respeita DB_POOL_LIMIT customizado dentro dos limites aceitáveis", () => {
    const original = process.env.DB_POOL_LIMIT;
    try {
      process.env.DB_POOL_LIMIT = "25";
      const config = getPoolConfig();
      expect(config.connectionLimit).toBe(25);
      expect(config.maxIdle).toBe(5);
    } finally {
      if (original) {
        process.env.DB_POOL_LIMIT = original;
      } else {
        delete process.env.DB_POOL_LIMIT;
      }
    }
  });

  it("permite encerramento limpo sem erros", async () => {
    await expect(closeDbPool()).resolves.toBeUndefined();
  });
});
