import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import { getMacroBrief } from "../macroData";
import {
  fetchEconomicCalendar,
  fetchFundamentals,
  fetchHistoricalCandles,
  fetchLiveQuote,
  fetchProviderNews,
  getProviderStatus,
  hasLiveQuoteCoverage,
} from "../marketProviders";
import { fetchOfficialNews } from "../officialNews";
import { getDataSourceGovernance } from "../dataSourcePolicy";
import { fetchCvmIssuer } from "../cvmData";
import { fetchB3IssuerIdentity } from "../b3ReferenceData";
import { fetchCvmFinancialStatements } from "../cvmFinancialData";
import { deriveFinancialMetrics } from "../financialMetrics";
import { getStoredCvmFinancialStatements } from "../cvmFinancialRepository";
import {
  getAssetSnapshot,
  getStoredAssetSnapshot,
  type AssetSnapshot,
} from "../assetSnapshot";
import {
  getAssetByTicker,
  getQuotes,
  listAssets,
  listDividends,
  listEconomicEvents,
  listNews,
  updateAssetQuote,
} from "../db";
import { catalogQuoteFromAsset } from "../../shared/marketData";

const asNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const asNullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const dynamicMetric = (asset: unknown, key: string) =>
  asNumber((asset as Record<string, unknown>)[key]);
const quoteRefreshes = new Map<string, number>();
const MIN_REFRESH_INTERVAL_MS = 12_000;

async function listAssetsWithLiveQuotes(input?: {
  search?: string;
  assetType?: string;
}): Promise<AssetSnapshot[]> {
  const baseAssets = await listAssets(input);
  // Catalog screens use the official persisted close. Live provider calls are
  // reserved for an explicit asset detail request, avoiding a quota burst that
  // grows linearly with the size of the universe.
  return baseAssets.map(getStoredAssetSnapshot);
}

function movingAverage(values: number[], period: number) {
  return values.map((_, index) => {
    if (index + 1 < period) return null;
    const slice = values.slice(Math.max(0, index - period + 1), index + 1);
    return slice.reduce((total, value) => total + value, 0) / slice.length;
  });
}

function rsi(values: number[], period = 14) {
  return values.map((_, index) => {
    if (index < period) return null;
    const start = Math.max(1, index - period + 1);
    let gains = 0;
    let losses = 0;
    for (let position = start; position <= index; position += 1) {
      const delta = values[position] - values[position - 1];
      if (delta >= 0) gains += delta;
      else losses += Math.abs(delta);
    }
    if (!losses) return 100;
    return 100 - 100 / (1 + gains / losses);
  });
}

async function buildAssetSnapshot(ticker: string, interval = "1D") {
  const asset = await getAssetByTicker(ticker);
  if (!asset) return null;
  const providerStatus = getProviderStatus();
  const storedQuotes = await getQuotes(asset.id, interval, 180);
  const fallbackQuotes = storedQuotes.length
    ? storedQuotes
    : await getQuotes(asset.id, "1D", 180);
  const [liveQuote, liveCandles, liveFundamentals] = await Promise.all([
    fetchLiveQuote(asset.ticker, asset.assetType),
    fetchHistoricalCandles(asset.ticker, asset.assetType, interval, 180),
    fetchFundamentals(asset.ticker, asset.assetType),
  ]);
  const quote = liveQuote
    ? { ...liveQuote, freshness: "delayed" as const, isDemo: false }
    : catalogQuoteFromAsset(asset);
  const quoteRows = liveCandles.length ? liveCandles : fallbackQuotes;
  const historySource: string =
    liveCandles[0]?.source ??
    (fallbackQuotes[0] && "source" in fallbackQuotes[0]
      ? String(fallbackQuotes[0].source)
      : "catalog");
  const hasStoredNonCatalogHistory =
    !liveCandles.length &&
    fallbackQuotes.length > 0 &&
    historySource !== "catalog";
  const closes = quoteRows.map(quote =>
    asNumber("close" in quote ? quote.close : 0)
  );
  const sma20 = movingAverage(closes, 20);
  const sma200 = movingAverage(closes, 200);
  const rsi14 = rsi(closes);
  const assetWithLiveFundamentals = liveFundamentals
    ? {
        ...asset,
        peRatio: liveFundamentals.peRatio?.toFixed(6) ?? asset.peRatio,
        pbRatio: liveFundamentals.pbRatio?.toFixed(6) ?? asset.pbRatio,
        dividendYield:
          liveFundamentals.dividendYield?.toFixed(6) ?? asset.dividendYield,
        roe: liveFundamentals.roe?.toFixed(6) ?? asset.roe,
        netMargin: liveFundamentals.netMargin?.toFixed(6) ?? asset.netMargin,
        enterpriseValue: liveFundamentals.enterpriseValue,
        ebitda: liveFundamentals.ebitda,
        netDebt: liveFundamentals.netDebt,
        freeCashFlow: liveFundamentals.freeCashFlow,
        earningsGrowth: liveFundamentals.earningsGrowth,
        revenueGrowth: liveFundamentals.revenueGrowth,
        fundamentalsAsOf: liveFundamentals.asOf,
        source: liveFundamentals.source,
      }
    : asset;
  return {
    asset: assetWithLiveFundamentals,
    quote,
    quotes: quoteRows.map((quote, index) => ({
      time: "quoteTime" in quote ? quote.quoteTime : quote.time,
      open: asNumber(quote.open),
      high: asNumber(quote.high),
      low: asNumber(quote.low),
      close: asNumber(quote.close),
      volume: asNullableNumber(quote.volume),
      sma20: sma20[index],
      sma200: sma200[index],
      rsi14: rsi14[index],
      source: "source" in quote ? quote.source : "catalog",
    })),
    providerStatus,
    // Preserve the source of stored historical candles when the live history
    // provider is unavailable. A stale real series is not the same as demo data.
    dataSource: historySource,
    fundamentalsSource: liveFundamentals?.source ?? "catalog",
    fundamentalsMeta: {
      source: liveFundamentals?.source ?? "catalog",
      asOf: liveFundamentals?.asOf ?? quote.asOf,
      freshness: liveFundamentals ? ("close" as const) : ("demo" as const),
      isDemo: !liveFundamentals,
    },
    isDemo:
      !liveCandles.length && !liveFundamentals && !hasStoredNonCatalogHistory,
  };
}

import { fetchTreasuryOverview } from "../treasuryData";

export const marketRouter = router({
  assets: publicProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          assetType: z.string().optional(),
        })
        .optional()
    )
    .query(({ input }) => listAssetsWithLiveQuotes(input)),
  providerStatus: publicProcedure.query(() => getProviderStatus()),
  dataSources: publicProcedure.query(() => getDataSourceGovernance()),
  macroBrief: publicProcedure.query(() => getMacroBrief()),
  treasury: publicProcedure.query(() => fetchTreasuryOverview()),
  dataQuality: publicProcedure.query(async () => {
    const live = await fetchLiveQuote("PETR4", "STOCK");
    return {
      isDemo: false,
      status: live ? ("available" as const) : ("unavailable" as const),
      source: live?.source ?? null,
      checkedAt: new Date(),
    };
  }),
  coverageSummary: publicProcedure.query(async () => {
    const snapshots = await listAssetsWithLiveQuotes();
    const bySource = snapshots.reduce<Record<string, number>>(
      (summary, item) => {
        summary[item.source] = (summary[item.source] ?? 0) + 1;
        return summary;
      },
      {}
    );
    const available = snapshots.filter(
      item => item.price !== null && item.source !== "catalog"
    ).length;
    const unavailable = snapshots.filter(item => item.price === null).length;
    const demonstration = snapshots.filter(item => item.isDemo).length;
    const stale = snapshots.filter(item => item.freshness === "stale").length;
    const timestamps = snapshots
      .map(item => new Date(item.fetchedAt).valueOf())
      .filter(
        timestamp =>
          Number.isFinite(timestamp) && timestamp > Date.UTC(2000, 0, 1)
      );
    const b3Timestamps = snapshots
      .filter(item => item.source === "b3" && item.price !== null)
      .map(item => new Date(item.fetchedAt).valueOf())
      .filter(Number.isFinite);
    const latestB3Timestamp = b3Timestamps.length
      ? Math.max(...b3Timestamps)
      : null;
    const behindLatest =
      latestB3Timestamp === null
        ? 0
        : snapshots.filter(item => {
            if (item.source !== "b3" || item.price === null) return false;
            const timestamp = new Date(item.fetchedAt).valueOf();
            return Number.isFinite(timestamp) && timestamp < latestB3Timestamp;
          }).length;
    return {
      total: snapshots.length,
      available,
      unavailable,
      demonstration,
      stale,
      behindLatest,
      coveragePercent: snapshots.length
        ? Math.round((available / snapshots.length) * 100)
        : 0,
      bySource,
      oldestAsOf: timestamps.length ? new Date(Math.min(...timestamps)) : null,
      newestAsOf: timestamps.length ? new Date(Math.max(...timestamps)) : null,
      latestB3AsOf:
        latestB3Timestamp === null ? null : new Date(latestB3Timestamp),
      checkedAt: new Date(),
    };
  }),
  editorialStatus: publicProcedure.query(async () => {
    const [providerNews, officialNews, calendar] = await Promise.all([
      fetchProviderNews("PETR4"),
      fetchOfficialNews(),
      fetchEconomicCalendar(),
    ]);
    const firstNews = providerNews[0] ?? officialNews[0];
    return {
      newsIsDemo: !firstNews,
      newsSource: firstNews?.source ?? "catalog",
      calendarIsDemo: calendar.length === 0,
      calendarSource: calendar[0]?.source ?? "catalog",
      checkedAt: new Date(),
    };
  }),
  asset: publicProcedure
    .input(
      z.object({
        ticker: z.string().min(1),
        interval: z.string().default("1D"),
      })
    )
    .query(({ input }) => buildAssetSnapshot(input.ticker, input.interval)),
  issuer: publicProcedure
    .input(z.object({ ticker: z.string().min(1) }))
    .query(async ({ input }) => {
      const asset = await getAssetByTicker(input.ticker);
      if (!asset) return null;
      const stored = await getStoredCvmFinancialStatements(
        asset.id,
        asset.ticker
      );
      if (stored)
        return { ...stored, derivedMetrics: deriveFinancialMetrics(stored) };
      const b3 = await fetchB3IssuerIdentity(asset.ticker, asset.assetType);
      if (!b3) return null;
      const cvm = await fetchCvmIssuer(asset.ticker, b3.cnpj);
      return { b3, cvm };
    }),
  financialStatements: publicProcedure
    .input(z.object({ ticker: z.string().min(1) }))
    .query(async ({ input }) => {
      const asset = await getAssetByTicker(input.ticker);
      if (!asset) return null;
      const b3 = await fetchB3IssuerIdentity(asset.ticker, asset.assetType);
      if (!b3) return null;
      const statement = await fetchCvmFinancialStatements(
        asset.ticker,
        b3.cnpj
      );
      return statement
        ? { ...statement, derivedMetrics: deriveFinancialMetrics(statement) }
        : null;
    }),
  refreshQuote: publicProcedure
    .input(z.object({ ticker: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const asset = await getAssetByTicker(input.ticker);
      if (!asset) return { ok: false, source: "catalog" as const };
      const lastRefresh = quoteRefreshes.get(asset.ticker) ?? 0;
      if (Date.now() - lastRefresh < MIN_REFRESH_INTERVAL_MS) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message:
            "A cotação foi atualizada há poucos segundos. Aguarde para consultar novamente.",
        });
      }
      quoteRefreshes.set(asset.ticker, Date.now());
      const live = await fetchLiveQuote(asset.ticker, asset.assetType);
      if (!live) return { ok: false, source: "catalog" as const };
      await updateAssetQuote(asset.id, live);
      return { ok: true, source: live.source, quote: live };
    }),
  news: publicProcedure
    .input(
      z
        .object({
          assetId: z.number().optional(),
          category: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const stored = await listNews(input);
      const matchesCategory = (category: string) =>
        !input?.category || category === input.category;
      if (!input?.assetId) {
        const official = await fetchOfficialNews();
        if (!official.length)
          return stored
            .filter(
              item =>
                item.sourceName !== "Apex Brief" &&
                item.sourceName !== "catalog" &&
                matchesCategory(item.category)
            )
            .map(item => ({ ...item, relatedTickers: [] as string[] }));
        return official
          .map((item, index) => ({
            id: -(index + 1),
            assetId: null,
            title: item.headline,
            summary: item.summary,
            sourceName: item.sourceName,
            url: item.url,
            category: item.category,
            relatedTickers: item.relatedTickers,
            publishedAt: item.publishedAt,
            createdAt: item.publishedAt,
          }))
          .filter(item => matchesCategory(item.category));
      }
      const asset = await (async () => {
        const matches = await listAssets();
        return matches.find(item => item.id === input.assetId);
      })();
      if (!asset)
        return stored.map(item => ({
          ...item,
          relatedTickers: [] as string[],
        }));
      const live = await fetchProviderNews(asset.ticker);
      if (!live.length)
        return stored.map(item => ({
          ...item,
          relatedTickers: [] as string[],
        }));
      return live.map((item, index) => ({
        id: -(index + 1),
        assetId: asset.id,
        title: item.headline,
        summary:
          item.summary ?? "Link externo organizado para consulta informativa.",
        sourceName: item.source,
        url: item.url,
        category: input.category ?? "Mercado",
        relatedTickers: item.relatedTicker ? [item.relatedTicker] : [],
        publishedAt: item.publishedAt,
        createdAt: item.publishedAt,
      }));
    }),
  calendar: publicProcedure.query(async () => {
    const live = await fetchEconomicCalendar();
    if (!live.length) return listEconomicEvents();
    return live.map((item, index) => ({
      id: -(index + 1),
      title: item.title,
      category: item.category,
      country: item.country ?? "—",
      importance:
        item.importance === "high" || item.importance === "HIGH"
          ? ("HIGH" as const)
          : ("MEDIUM" as const),
      eventDate: item.eventDate,
      forecast: item.forecast,
      previous: item.previous,
      sourceName: item.source,
      createdAt: item.eventDate,
    }));
  }),
  dividends: publicProcedure
    .input(z.object({ ticker: z.string().min(1) }))
    .query(async ({ input }) => {
      const asset = await getAssetByTicker(input.ticker);
      return asset ? listDividends(asset.id) : [];
    }),
  screener: publicProcedure
    .input(
      z.object({
        assetType: z.string().optional(),
        minPe: z.number().optional(),
        maxPe: z.number().optional(),
        minDividendYield: z.number().optional(),
        minRoe: z.number().optional(),
        maxPb: z.number().optional(),
        minNetMargin: z.number().optional(),
        minEbitda: z.number().optional(),
        maxNetDebt: z.number().optional(),
        minEarningsGrowth: z.number().optional(),
        minRevenueGrowth: z.number().optional(),
        sortBy: z
          .enum([
            "change",
            "dividendYield",
            "roe",
            "volume",
            "pe",
            "ebitda",
            "earningsGrowth",
            "revenueGrowth",
          ])
          .default("change"),
      })
    )
    .query(async ({ input }) => {
      const baseAssets = await listAssets({ assetType: input.assetType });
      const advancedRequested =
        input.minEbitda !== undefined ||
        input.maxNetDebt !== undefined ||
        input.minEarningsGrowth !== undefined ||
        input.minRevenueGrowth !== undefined ||
        input.sortBy === "ebitda" ||
        input.sortBy === "earningsGrowth" ||
        input.sortBy === "revenueGrowth";
      const assets = advancedRequested
        ? await Promise.all(
            baseAssets.map(async asset => {
              const fundamentals = await fetchFundamentals(
                asset.ticker,
                asset.assetType
              );
              return fundamentals
                ? {
                    ...asset,
                    ...fundamentals,
                    fundamentalsAsOf: fundamentals.asOf,
                  }
                : asset;
            })
          )
        : baseAssets;
      const filtered = assets.filter(asset => {
        const pe = asNumber(asset.peRatio);
        const pb = asNumber(asset.pbRatio);
        const dy = asNumber(asset.dividendYield);
        const roeValue = asNumber(asset.roe);
        const margin = asNumber(asset.netMargin);
        const ebitda = dynamicMetric(asset, "ebitda");
        const netDebt = dynamicMetric(asset, "netDebt");
        const earningsGrowth = dynamicMetric(asset, "earningsGrowth");
        const revenueGrowth = dynamicMetric(asset, "revenueGrowth");
        return (
          (input.minPe === undefined || pe >= input.minPe) &&
          (input.maxPe === undefined || pe <= input.maxPe) &&
          (input.minDividendYield === undefined ||
            dy >= input.minDividendYield) &&
          (input.minRoe === undefined || roeValue >= input.minRoe) &&
          (input.maxPb === undefined || pb <= input.maxPb) &&
          (input.minNetMargin === undefined || margin >= input.minNetMargin) &&
          (input.minEbitda === undefined || ebitda >= input.minEbitda) &&
          (input.maxNetDebt === undefined || netDebt <= input.maxNetDebt) &&
          (input.minEarningsGrowth === undefined ||
            earningsGrowth >= input.minEarningsGrowth) &&
          (input.minRevenueGrowth === undefined ||
            revenueGrowth >= input.minRevenueGrowth)
        );
      });
      return filtered.sort((a, b) => {
        if (input.sortBy === "dividendYield")
          return asNumber(b.dividendYield) - asNumber(a.dividendYield);
        if (input.sortBy === "roe") return asNumber(b.roe) - asNumber(a.roe);
        if (input.sortBy === "volume")
          return asNumber(b.dayVolume) - asNumber(a.dayVolume);
        if (input.sortBy === "pe")
          return asNumber(a.peRatio) - asNumber(b.peRatio);
        if (input.sortBy === "ebitda")
          return dynamicMetric(b, "ebitda") - dynamicMetric(a, "ebitda");
        if (input.sortBy === "earningsGrowth")
          return (
            dynamicMetric(b, "earningsGrowth") -
            dynamicMetric(a, "earningsGrowth")
          );
        if (input.sortBy === "revenueGrowth")
          return (
            dynamicMetric(b, "revenueGrowth") -
            dynamicMetric(a, "revenueGrowth")
          );
        return asNumber(b.changePercent) - asNumber(a.changePercent);
      });
    }),
  compare: publicProcedure
    .input(z.object({ tickers: z.array(z.string().min(1)).min(1).max(4) }))
    .query(async ({ input }) => {
      const snapshots = await Promise.all(
        input.tickers.map(ticker => buildAssetSnapshot(ticker))
      );
      return snapshots.filter(Boolean);
    }),
});
