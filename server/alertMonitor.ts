import { listAlertAssets, updateAssetQuote } from "./db";
import { fetchLiveQuote } from "./marketProviders";

const ALERT_POLL_INTERVAL_MS = 60_000;

/**
 * Evaluates active alerts even when no browser is open. This is intentionally
 * scoped to assets that users are monitoring, which keeps provider usage tied
 * to customer value rather than to catalog size.
 */
export function startAlertMonitor() {
  let running = false;

  const run = async () => {
    if (running) return;
    running = true;
    try {
      const assets = await listAlertAssets();
      await Promise.allSettled(
        assets.map(async asset => {
          const quote = await fetchLiveQuote(asset.ticker, asset.assetType);
          if (quote) await updateAssetQuote(asset.id, quote);
        })
      );
    } finally {
      running = false;
    }
  };

  void run();
  return setInterval(() => void run(), ALERT_POLL_INTERVAL_MS);
}

/** Executes one alert cycle for Cloud Scheduler or operational checks. */
export async function runAlertMonitorOnce() {
  const assets = await listAlertAssets();
  const results = await Promise.allSettled(
    assets.map(async asset => {
      const quote = await fetchLiveQuote(asset.ticker, asset.assetType);
      if (quote) await updateAssetQuote(asset.id, quote);
    })
  );
  return {
    checked: assets.length,
    failed: results.filter(result => result.status === "rejected").length,
  };
}
