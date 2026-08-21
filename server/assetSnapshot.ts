import { catalogQuoteFromAsset, type MarketDataFreshness, type MarketDataSource } from "../shared/marketData";
import { fetchFundamentals, fetchLiveQuote, type ProviderFundamentals } from "./marketProviders";
import { getAssetByTicker } from "./db";

export type AssetSnapshotFundamentals = {
  peRatio: number | null;
  pbRatio: number | null;
  dividendYield: number | null;
  roe: number | null;
  netMargin: number | null;
};

/**
 * Canonical, cross-page snapshot for a single asset.
 *
 * All product pages should read from this snapshot so that the same ticker
 * displays the same price, change, volume and source metadata everywhere.
 *
 * TTL policy: 20 seconds. Market prices move quickly and the backend already
 * caches provider responses for 20s (quoteCacheTtlMs in marketProviders), so
 * the snapshot TTL matches that layer. This keeps the three target pages
 * (Markets, AssetDetail, Compare) consistent while still refreshing near
 * real-time.
 */
export type AssetSnapshot = {
  id: number;
  ticker: string;
  name: string;
  assetType: string;
  exchange: string;
  currency: string;
  sector: string | null;
  price: number;
  lastPrice: string;
  changePercent: number;
  changeAmount: number;
  volume: number;
  dayVolume: string;
  open: number;
  dayHigh: number;
  dayLow: number;
  fundamentals: AssetSnapshotFundamentals;
  source: MarketDataSource;
  freshness: MarketDataFreshness;
  fetchedAt: string;
  updatedAt: Date;
  ttlMs: number;
  isDemo: boolean;
};

const SNAPSHOT_TTL_MS = 20_000;

const cache = new Map<
  string,
  { snapshot: AssetSnapshot; fetchedAt: number }
>();

function numberOrNull(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function numberOrZero(value: unknown): number {
  return numberOrNull(value) ?? 0;
}

function formatPriceCompat(value: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: value < 10 ? 4 : 2,
  }).format(value);
}

function formatCompactCompat(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function parseFetchedAt(asOf: string | undefined): Date {
  if (!asOf) return new Date();
  const parsed = new Date(asOf);
  return Number.isNaN(parsed.valueOf()) ? new Date() : parsed;
}

function buildFundamentals(
  asset: Awaited<ReturnType<typeof getAssetByTicker>>,
  live: ProviderFundamentals | null
): AssetSnapshotFundamentals {
  return {
    peRatio: numberOrNull(live?.peRatio ?? asset?.peRatio),
    pbRatio: numberOrNull(live?.pbRatio ?? asset?.pbRatio),
    dividendYield: numberOrNull(live?.dividendYield ?? asset?.dividendYield),
    roe: numberOrNull(live?.roe ?? asset?.roe),
    netMargin: numberOrNull(live?.netMargin ?? asset?.netMargin),
  };
}

function computeChangeAmount(price: number, changePercent: number): number {
  if (!Number.isFinite(price) || !Number.isFinite(changePercent)) return 0;
  if (changePercent === 0) return 0;
  const previousPrice = price / (1 + changePercent / 100);
  if (!Number.isFinite(previousPrice)) return 0;
  return price - previousPrice;
}

/**
 * Returns a canonical snapshot for the requested ticker.
 *
 * Flow:
 * 1. Check in-memory cache. If fresh, return cached snapshot.
 * 2. Resolve the asset record (database or demo catalog fallback).
 * 3. Fetch live quote and fundamentals through the provider chain defined in
 *    dataSourcePolicy.ts (cache -> brapi -> twelve-data -> finnhub).
 * 4. If no live quote is available, fall back to the catalog/demo values.
 * 5. Store in cache and return.
 */
export async function getAssetSnapshot(ticker: string): Promise<AssetSnapshot | null> {
  const normalizedTicker = ticker.trim().toUpperCase();
  const cached = cache.get(normalizedTicker);
  if (cached && Date.now() - cached.fetchedAt < SNAPSHOT_TTL_MS) {
    return cached.snapshot;
  }

  const asset = await getAssetByTicker(normalizedTicker);
  if (!asset) return null;

  const [liveQuote, liveFundamentals] = await Promise.all([
    fetchLiveQuote(asset.ticker, asset.assetType),
    fetchFundamentals(asset.ticker, asset.assetType),
  ]);

  const quote = liveQuote ?? catalogQuoteFromAsset(asset);
  const fundamentals = buildFundamentals(asset, liveFundamentals);

  const snapshot: AssetSnapshot = {
    id: asset.id,
    ticker: asset.ticker,
    name: asset.name,
    assetType: asset.assetType,
    exchange: asset.exchange,
    currency: asset.currency ?? "BRL",
    sector: asset.sector ?? null,
    price: numberOrZero(quote.price),
    lastPrice: formatPriceCompat(numberOrZero(quote.price), asset.currency ?? "BRL"),
    changePercent: numberOrZero(quote.changePercent),
    changeAmount: computeChangeAmount(numberOrZero(quote.price), numberOrZero(quote.changePercent)),
    volume: numberOrZero(quote.volume),
    dayVolume: formatCompactCompat(numberOrZero(quote.volume)),
    open: numberOrZero(quote.open),
    dayHigh: numberOrZero(quote.high),
    dayLow: numberOrZero(quote.low),
    fundamentals,
    source: quote.source,
    freshness: quote.freshness,
    fetchedAt: quote.asOf,
    updatedAt: parseFetchedAt(quote.asOf),
    ttlMs: SNAPSHOT_TTL_MS,
    isDemo: quote.isDemo,
  };

  cache.set(normalizedTicker, { snapshot, fetchedAt: Date.now() });
  return snapshot;
}

/** Test-only helper to reset the snapshot cache. */
export function clearAssetSnapshotCache() {
  cache.clear();
}
