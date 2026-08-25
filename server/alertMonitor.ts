import { listAlertAssets, updateAssetQuote } from "./db";
import { fetchLiveQuote } from "./marketProviders";
import { withDistributedLock, withRetry, CircuitBreaker } from "./reliability";
import { finishJobRun, startJobRun } from "./jobRuns";
const quoteCircuit = new CircuitBreaker("market.quote", 5, 30_000);

const ALERT_POLL_INTERVAL_MS = 60_000;

/**
 * Evaluates active alerts even when no browser is open. This is intentionally
 * scoped to assets that users are monitoring, which keeps provider usage tied
 * to customer value rather than to catalog size.
 */
export function startAlertMonitor() {
  void runAlertMonitorOnce();
  return setInterval(() => void runAlertMonitorOnce(), ALERT_POLL_INTERVAL_MS);
}

/** Executes one alert cycle for Cloud Scheduler or operational checks. */
export async function runAlertMonitorOnce() {
  const result = await withDistributedLock("virtus:jobs:alerts", async () => {
    const run = await startJobRun("alerts");
    try {
      const assets = await listAlertAssets();
      const results = await Promise.allSettled(
        assets.map(async asset => {
          const quote = await withRetry(
            () => quoteCircuit.exec(() => fetchLiveQuote(asset.ticker, asset.assetType)),
            { attempts: 3, baseDelayMs: 200, maxDelayMs: 2_000 }
          );
          if (quote) await updateAssetQuote(asset.id, quote);
        })
      );
      const failed = results.filter(item => item.status === "rejected").length;
      await finishJobRun(run, {
        status: failed ? "failed" : "succeeded",
        processed: assets.length,
        failed,
      });
      return { checked: assets.length, failed, skipped: false };
    } catch (error) {
      await finishJobRun(run, { status: "failed", error });
      throw error;
    }
  });
  return result ?? { checked: 0, failed: 0, skipped: true };
}
