import type { RequestHandler } from "express";

type Bucket = { count: number; resetAt: number };

export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private requestsSinceCleanup = 0;

  constructor(
    private readonly limit: number,
    private readonly windowMs: number
  ) {}

  consume(key: string, now = Date.now()) {
    this.requestsSinceCleanup += 1;
    if (this.requestsSinceCleanup >= 500) {
      this.requestsSinceCleanup = 0;
      for (const [bucketKey, bucket] of Array.from(this.buckets.entries())) {
        if (bucket.resetAt <= now) this.buckets.delete(bucketKey);
      }
    }

    const current = this.buckets.get(key);
    const bucket =
      !current || current.resetAt <= now
        ? { count: 0, resetAt: now + this.windowMs }
        : current;
    bucket.count += 1;
    this.buckets.set(key, bucket);

    return {
      allowed: bucket.count <= this.limit,
      limit: this.limit,
      remaining: Math.max(0, this.limit - bucket.count),
      resetAt: bucket.resetAt,
    };
  }
}

export function createApiRateLimit(options?: {
  limit?: number;
  windowMs?: number;
}): RequestHandler {
  const limiter = new FixedWindowRateLimiter(
    options?.limit ?? 120,
    options?.windowMs ?? 60_000
  );

  return (req, res, next) => {
    // Express resolves req.ip according to the explicitly configured trusted
    // proxy count, avoiding user-controlled X-Forwarded-For values here.
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const result = limiter.consume(key);
    const resetSeconds = Math.max(
      1,
      Math.ceil((result.resetAt - Date.now()) / 1000)
    );

    res.setHeader("RateLimit-Limit", String(result.limit));
    res.setHeader("RateLimit-Remaining", String(result.remaining));
    res.setHeader("RateLimit-Reset", String(resetSeconds));
    if (!result.allowed) {
      res.setHeader("Retry-After", String(resetSeconds));
      res.status(429).json({
        error: "rate_limit_exceeded",
        message: "Muitas solicitações. Aguarde um instante e tente novamente.",
      });
      return;
    }
    next();
  };
}
