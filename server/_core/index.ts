import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerMarketRealtime } from "../realtime";
import { startAlertMonitor } from "../alertMonitor";
import { runAlertMonitorOnce } from "../alertMonitor";
import { runCvmFinancialIngestion } from "../cvmFinancialIngestion";
import { runB3CotahistIngestion } from "../b3Cotahist";
import { runB3IndexSeed } from "../b3IndexSeed";
import { authorizeJobRequest, matchesJobSecret } from "../jobAuth";
import { getDb } from "../db";
import { logger } from "./logger";
import { randomUUID } from "node:crypto";
import { getMetrics, recordRequest } from "./metrics";
import { cleanupExpiredEmailDeliveries } from "../emailDelivery";
import { withDistributedLock } from "../reliability";
import { finishJobRun, listRecentJobRuns, startJobRun } from "../jobRuns";
import { cleanupProductionDemoData } from "../demoDataCleanup";
import { createApiRateLimit } from "../rateLimit";
import { sql } from "drizzle-orm";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  const server = createServer(app);
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    const forwardedRequestId = req.header("x-request-id")?.trim();
    const requestId =
      forwardedRequestId && forwardedRequestId.length <= 128
        ? forwardedRequestId
        : randomUUID();
    const startedAt = performance.now();
    res.setHeader("X-Request-Id", requestId);
    res.on("finish", () => {
      logger.info("http.request", {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
      });
      recordRequest(
        req.path,
        res.statusCode,
        Math.round(performance.now() - startedAt)
      );
    });
    next();
  });
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()"
    );
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: https://lh3.googleusercontent.com; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' https://apis.google.com https://www.googletagmanager.com; frame-src https://accounts.google.com https://portal-virtus.firebaseapp.com; connect-src 'self' ws: wss: https://*.run.app https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://www.google-analytics.com https://region1.google-analytics.com"
    );
    if (process.env.NODE_ENV === "production") {
      res.setHeader(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains"
      );
    }
    next();
  });
  registerMarketRealtime(server);
  if (process.env.ALERT_MONITOR_MODE !== "scheduler") startAlertMonitor();
  // The portal has no user file uploads; a small body limit reduces abuse risk.
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));
  const healthHandler = (_req: express.Request, res: express.Response) => {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ status: "ok", service: "virtus" });
  };
  app.get("/livez", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ status: "ok", service: "virtus" });
  });
  app.get("/healthz", healthHandler);
  app.get("/api/health", healthHandler);
  app.get("/api/metrics", async (req, res) => {
    const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
    if (!matchesJobSecret(token, process.env.CRON_SECRET)) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ service: "virtus", metrics: getMetrics() });
  });
  const readinessHandler = async (
    _req: express.Request,
    res: express.Response
  ) => {
    res.setHeader("Cache-Control", "no-store");
    const databaseConfigured = Boolean(process.env.DATABASE_URL);
    let databaseAvailable = !databaseConfigured;
    if (databaseConfigured) {
      try {
        const db = await getDb();
        if (db) {
          await db.execute(sql`SELECT 1 AS ready`);
          databaseAvailable = true;
        }
      } catch (error) {
        logger.error("readiness.database_failed", error);
      }
    }
    const ready = databaseAvailable;
    res.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "not_ready",
      service: "virtus",
      dependencies: {
        database: databaseConfigured
          ? databaseAvailable
            ? "available"
            : "unavailable"
          : "not_configured_demo_mode",
      },
    });
  };
  app.get("/readyz", readinessHandler);
  app.get("/api/ready", readinessHandler);
  app.post("/internal/jobs/alerts", async (req, res) => {
    if (!(await authorizeJobRequest(req))) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    try {
      const result = await runAlertMonitorOnce();
      res.status(200).json({ status: "ok", ...result });
    } catch (error) {
      logger.error("alerts.scheduled_cycle_failed", error, { job: "alerts" });
      res.status(500).json({ status: "error" });
    }
  });
  app.post("/internal/jobs/email-deliveries-cleanup", async (req, res) => {
    if (!(await authorizeJobRequest(req))) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    try {
      const result = await withDistributedLock(
        "virtus:jobs:email-deliveries-cleanup",
        async () => {
          const run = await startJobRun("email-deliveries-cleanup");
          try {
            const removed = await cleanupExpiredEmailDeliveries();
            await finishJobRun(run, {
              status: "succeeded",
              processed: removed,
            });
            return { removed };
          } catch (error) {
            await finishJobRun(run, { status: "failed", error });
            throw error;
          }
        }
      );
      res
        .status(200)
        .json({ status: "ok", skipped: result === null, ...(result ?? {}) });
    } catch (error) {
      logger.error("email_deliveries.cleanup_failed", error, {
        job: "email-deliveries-cleanup",
      });
      res.status(500).json({ status: "error" });
    }
  });
  app.post("/internal/jobs/cvm-financials", async (req, res) => {
    if (!(await authorizeJobRequest(req))) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    try {
      const configuredLimit = Number(process.env.CVM_INGESTION_LIMIT ?? 25);
      const limit = Number.isFinite(configuredLimit)
        ? Math.max(1, Math.min(configuredLimit, 100))
        : 25;
      const run = await startJobRun("cvm-financials");
      try {
        const result = await runCvmFinancialIngestion({ limit });
        await finishJobRun(run, {
          status: result.failures.length ? "failed" : "succeeded",
          processed: result.saved,
          failed: result.failures.length,
          details: { scanned: result.scanned, identified: result.identified },
        });
        res.status(200).json({ status: "ok", ...result });
      } catch (error) {
        await finishJobRun(run, { status: "failed", error });
        throw error;
      }
    } catch (error) {
      logger.error("cvm.scheduled_cycle_failed", error, {
        job: "cvm-financials",
      });
      res.status(500).json({ status: "error" });
    }
  });
  app.post("/internal/jobs/b3-cotahist", async (req, res) => {
    if (!(await authorizeJobRequest(req))) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    try {
      const result = await withDistributedLock(
        "virtus:jobs:b3-cotahist",
        async () => {
          const run = await startJobRun("b3-cotahist");
          try {
            const ingestion = await runB3CotahistIngestion();
            await finishJobRun(run, {
              status: "succeeded",
              processed: ingestion.saved,
              details: ingestion,
            });
            return ingestion;
          } catch (error) {
            await finishJobRun(run, { status: "failed", error });
            throw error;
          }
        }
      );
      res.status(200).json({
        status: "ok",
        skipped: result === null,
        ...(result ?? {}),
      });
    } catch (error) {
      logger.error("b3.cotahist_ingestion_failed", error, {
        job: "b3-cotahist",
      });
      res.status(500).json({ status: "error" });
    }
  });
  app.post("/internal/jobs/b3-universe", async (req, res) => {
    if (!(await authorizeJobRequest(req))) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    try {
      const result = await withDistributedLock("virtus:jobs:b3-universe", async () => {
        const run = await startJobRun("b3-universe");
        try {
          const synchronization = await runB3IndexSeed();
          await finishJobRun(run, {
            status: "succeeded",
            processed: synchronization.totalConstituents,
            details: synchronization,
          });
          return synchronization;
        } catch (error) {
          await finishJobRun(run, { status: "failed", error });
          throw error;
        }
      });
      res.status(200).json({ status: "ok", skipped: result === null, ...(result ?? {}) });
    } catch (error) {
      logger.error("b3.universe_synchronization_failed", error, { job: "b3-universe" });
      res.status(500).json({ status: "error" });
    }
  });
  app.post("/internal/jobs/demo-data-cleanup", async (req, res) => {
    if (!(await authorizeJobRequest(req))) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    if (req.body?.confirm !== "REMOVE_DEMO_DATA") {
      res.status(400).json({ error: "confirmation_required" });
      return;
    }
    try {
      const result = await withDistributedLock(
        "virtus:jobs:demo-data-cleanup",
        cleanupProductionDemoData
      );
      res.status(200).json({
        status: "ok",
        skipped: result === null,
        ...(result ?? {}),
      });
    } catch (error) {
      logger.error("demo_data.cleanup_failed", error, {
        job: "demo-data-cleanup",
      });
      res.status(500).json({ status: "error" });
    }
  });
  app.get("/internal/jobs/runs", async (req, res) => {
    if (!(await authorizeJobRequest(req))) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const limit = Number(req.query.limit ?? 50);
    res
      .status(200)
      .json({
        runs: await listRecentJobRuns(Number.isFinite(limit) ? limit : 50),
      });
  });
  registerStorageProxy(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createApiRateLimit(),
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    logger.warn("server.port_fallback", {
      preferredPort,
      selectedPort: port,
    });
  }

  server.listen(port, () => {
    logger.info("server.started", { port });
  });
}

startServer().catch(error => logger.error("server.start_failed", error));
