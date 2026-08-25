import { createConnection } from "mysql2/promise";
import { logger } from "./_core/logger";

export type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
};

const defaultShouldRetry = () => true;

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 250);
  const maxDelayMs = Math.max(baseDelayMs, options.maxDelayMs ?? 4_000);
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !shouldRetry(error)) throw error;
      const delayMs = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      options.onRetry?.(error, attempt, delayMs);
      if (delayMs > 0)
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;

  constructor(
    private readonly name: string,
    private readonly failureThreshold = 3,
    private readonly resetTimeoutMs = 30_000
  ) {}

  async exec<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error(`Circuit open: ${this.name}`);
    }
    try {
      const result = await operation();
      this.failures = 0;
      this.openedAt = 0;
      return result;
    } catch (error) {
      this.failures += 1;
      if (this.failures >= this.failureThreshold) {
        this.openedAt = Date.now();
        logger.warn("reliability.circuit_open", {
          circuit: this.name,
          failures: this.failures,
        });
      }
      throw error;
    }
  }

  private isOpen() {
    if (!this.openedAt) return false;
    if (Date.now() - this.openedAt >= this.resetTimeoutMs) {
      this.openedAt = 0;
      this.failures = 0;
      return false;
    }
    return true;
  }
}

const localLocks = new Set<string>();

export async function withDistributedLock<T>(
  name: string,
  operation: () => Promise<T>,
  options: { waitSeconds?: number } = {}
): Promise<T | null> {
  const waitSeconds = Math.max(0, Math.min(options.waitSeconds ?? 1, 30));
  // Dynamic import keeps the reliability layer independent from the DB module
  // during startup; db.ts also owns the email side effect path.
  const { getDb } = await import("./db");
  const db = await getDb();
  let acquired = false;
  let lockConnection: Awaited<ReturnType<typeof createConnection>> | null = null;

  if (db && process.env.DATABASE_URL) {
    // MySQL advisory locks belong to a connection. A dedicated connection is
    // required so acquisition and release always occur in the same session.
    lockConnection = await createConnection(process.env.DATABASE_URL);
    const [rows] = await lockConnection.execute(
      "SELECT GET_LOCK(?, ?) AS acquired",
      [name, waitSeconds]
    );
    const firstRow = Array.isArray(rows) ? rows[0] : rows;
    acquired = Number((firstRow as { acquired?: unknown })?.acquired) === 1;
    if (!acquired) {
      await lockConnection.end();
      lockConnection = null;
    }
  } else {
    if (localLocks.has(name)) return null;
    localLocks.add(name);
    acquired = true;
  }

  if (!acquired) return null;
  try {
    return await operation();
  } finally {
    if (lockConnection) {
      try {
        await lockConnection.execute("SELECT RELEASE_LOCK(?)", [name]);
      } finally {
        await lockConnection.end();
      }
    } else {
      localLocks.delete(name);
    }
  }
}

export function clearReliabilityLocksForTests() {
  localLocks.clear();
}
