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
import { matchesJobSecret } from "../jobAuth";

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
  const server = createServer(app);
  app.disable("x-powered-by");
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
  app.get("/healthz", healthHandler);
  app.get("/api/health", healthHandler);
  app.post("/internal/jobs/alerts", async (req, res) => {
    const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
    if (!matchesJobSecret(token, process.env.CRON_SECRET)) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    try {
      const result = await runAlertMonitorOnce();
      res.status(200).json({ status: "ok", ...result });
    } catch (error) {
      console.error("[Alerts] Scheduled cycle failed", error);
      res.status(500).json({ status: "error" });
    }
  });
  app.post("/internal/jobs/cvm-financials", async (req, res) => {
    const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
    if (!matchesJobSecret(token, process.env.CRON_SECRET)) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    try {
      const configuredLimit = Number(process.env.CVM_INGESTION_LIMIT ?? 25);
      const limit = Number.isFinite(configuredLimit)
        ? Math.max(1, Math.min(configuredLimit, 100))
        : 25;
      const result = await runCvmFinancialIngestion({ limit });
      res.status(200).json({ status: "ok", ...result });
    } catch (error) {
      console.error("[CVM Ingestion] Scheduled cycle failed", error);
      res.status(500).json({ status: "error" });
    }
  });
  registerStorageProxy(app);
  // tRPC API
  app.use(
    "/api/trpc",
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
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
