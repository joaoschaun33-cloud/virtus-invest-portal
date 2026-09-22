import { marketSourceOrder, type MarketProviderId } from "./dataSourcePolicy";
import type { MarketDataFreshness } from "../shared/marketData";
import { logger } from "./_core/logger";

export type ProviderSource =
  | "brapi"
  | "twelve-data"
  | "finnhub"
  | "coingecko"
  | "eodhd"
  | "catalog";

export type ProviderQuote = {
  ticker: string;
  price: number;
  changePercent: number | null;
  volume: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  source: ProviderSource;
  asOf: string;
  freshness: MarketDataFreshness;
  isDemo: boolean;
};

export type ProviderCandle = {
  time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  source: Exclude<ProviderSource, "catalog">;
};

export type ProviderFundamentals = {
  ticker: string;
  peRatio?: number;
  pbRatio?: number;
  dividendYield?: number;
  roe?: number;
  netMargin?: number;
  enterpriseValue?: number;
  ebitda?: number;
  netDebt?: number;
  freeCashFlow?: number;
  earningsGrowth?: number;
  revenueGrowth?: number;
  source: Exclude<ProviderSource, "catalog">;
  asOf: string;
};

export type ProviderNewsItem = {
  headline: string;
  summary?: string;
  sourceName: string;
  url: string;
  image?: string;
  publishedAt: Date;
  relatedTicker?: string;
  source: Exclude<ProviderSource, "catalog">;
};

export type ProviderEconomicEvent = {
  title: string;
  category: string;
  country?: string;
  importance?: string;
  eventDate: Date;
  forecast?: string;
  previous?: string;
  source: Exclude<ProviderSource, "catalog"> | "bcb";
};

export type ProviderStatus = {
  brapi: boolean;
  twelveData: boolean;
  finnhub: boolean;
  coinGecko: boolean;
  eodhd: boolean;
  resend: boolean;
};

export type ProviderCoverage = {
  quotes: boolean;
  history: boolean;
  fundamentals: boolean;
  news: boolean;
  calendar: boolean;
};

export const PROVIDER_COVERAGE: Record<
  Exclude<ProviderSource, "catalog">,
  ProviderCoverage
> = {
  brapi: {
    quotes: true,
    history: true,
    fundamentals: true,
    news: false,
    calendar: false,
  },
  "twelve-data": {
    quotes: true,
    history: true,
    fundamentals: true,
    news: true,
    calendar: false,
  },
  finnhub: {
    quotes: true,
    history: true,
    fundamentals: true,
    news: true,
    calendar: true,
  },
  coingecko: {
    quotes: true,
    history: true,
    fundamentals: false,
    news: false,
    calendar: false,
  },
  eodhd: {
    quotes: true,
    history: true,
    fundamentals: false,
    news: false,
    calendar: false,
  },
};

const timeoutMs = 6500;
const responseCache = new Map<
  string,
  { expiresAt: number; payload: unknown }
>();
const pendingResponses = new Map<string, Promise<any | null>>();
const responseCacheTtlMs = 60_000;
// Keep the provider cache aligned with the realtime polling contract. The UI
// may request every 30 seconds; it must not receive a 20-minute-old quote while
// presenting it as a recent update.
const quoteCacheTtlMs = 20_000;
const quoteCache = new Map<
  string,
  { expiresAt: number; quote: ProviderQuote | null }
>();

type QuoteProvider = MarketProviderId;
const catalogProviderSymbols: Record<
  string,
  Partial<Record<QuoteProvider, string>>
> = {
  PETR4: { brapi: "PETR4" },
  VALE3: { brapi: "VALE3" },
  ITUB4: { brapi: "ITUB4" },
  HGLG11: { brapi: "HGLG11" },
  IVVB11: { brapi: "IVVB11" },
  IBOV: { brapi: "^BVSP" },
  "EUR/USD": { "twelve-data": "EUR/USD" },
  "BTC/USD": { "twelve-data": "BTC/USD" },
  "ETH/USD": { "twelve-data": "ETH/USD" },
  "SOL/USD": { "twelve-data": "SOL/USD" },
  SPX: {},
  IXIC: {},
  DXY: {},
  "BZ=F": {},
};

function quoteSymbol(
  ticker: string,
  assetType: string,
  provider: QuoteProvider
) {
  const normalizedTicker = ticker.toUpperCase();
  if (normalizedTicker in catalogProviderSymbols)
    return catalogProviderSymbols[normalizedTicker][provider] ?? null;
  const normalizedType = assetType.toUpperCase();
  if (provider === "brapi" && ["STOCK", "REIT", "ETF"].includes(normalizedType))
    return normalizedTicker;
  if (
    provider === "twelve-data" &&
    ["FOREX", "CRYPTO"].includes(normalizedType)
  )
    return normalizedTicker;
  return null;
}

export function hasLiveQuoteCoverage(ticker: string, assetType: string) {
  if (assetType.toUpperCase() === "CRYPTO" && coinGeckoId(ticker)) return true;
  if (eodhdSymbol(ticker, assetType)) return true;
  return (["brapi", "twelve-data", "finnhub"] as const).some(provider =>
    Boolean(quoteSymbol(ticker, assetType, provider))
  );
}

async function fetchJson(
  url: string,
  headers: Record<string, string> = {},
  cacheTtlMs = responseCacheTtlMs
): Promise<any | null> {
  const parsed = new URL(url);
  for (const secret of [
    "api_token",
    "apikey",
    "token",
    "x_cg_demo_api_key",
    "x_cg_pro_api_key",
  ])
    if (parsed.searchParams.has(secret))
      parsed.searchParams.set(secret, "[credential]");
  const authenticated = Object.keys(headers).some(key =>
    ["authorization", "x-cg-demo-api-key", "x-cg-pro-api-key"].includes(
      key.toLowerCase()
    )
  );
  const cacheKey = `${parsed.toString()}|${authenticated ? "authenticated" : "public"}`;
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.payload;
  const pending = pendingResponses.get(cacheKey);
  if (pending) return pending;
  const request = fetchJsonUncached(url, headers, cacheKey, cacheTtlMs);
  pendingResponses.set(cacheKey, request);
  try {
    return await request;
  } finally {
    pendingResponses.delete(cacheKey);
  }
}

async function fetchJsonUncached(
  url: string,
  headers: Record<string, string>,
  cacheKey: string,
  cacheTtlMs: number
): Promise<any | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", ...headers },
    });
    if (!response.ok) return null;
    const payload = await response.json();
    if (payload?.status === "error" || payload?.code >= 400) return null;
    responseCache.set(cacheKey, {
      expiresAt: Date.now() + cacheTtlMs,
      payload,
    });
    return payload;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

const coinGeckoIds: Record<string, string> = {
  "BTC/USD": "bitcoin",
  BTC: "bitcoin",
  "ETH/USD": "ethereum",
  ETH: "ethereum",
  "SOL/USD": "solana",
  SOL: "solana",
};

function coinGeckoId(ticker: string) {
  return coinGeckoIds[ticker.trim().toUpperCase()] ?? null;
}

function coinGeckoConfig() {
  const apiKey = process.env.COINGECKO_API_KEY;
  if (!apiKey) return null;
  const pro = process.env.COINGECKO_PLAN?.toLowerCase() === "pro";
  return {
    apiKey,
    baseUrl: pro
      ? "https://pro-api.coingecko.com/api/v3"
      : "https://api.coingecko.com/api/v3",
    header: pro ? "x-cg-pro-api-key" : "x-cg-demo-api-key",
  };
}

function eodhdSymbol(ticker: string, assetType: string) {
  const normalized = ticker.trim().toUpperCase();
  const known: Record<string, string> = {
    IBOV: "BVSP.INDX",
    "BTC/USD": "BTC-USD.CC",
    "ETH/USD": "ETH-USD.CC",
    "SOL/USD": "SOL-USD.CC",
    "EUR/USD": "EURUSD.FOREX",
  };
  if (known[normalized]) return known[normalized];
  if (["STOCK", "REIT", "ETF"].includes(assetType.toUpperCase()))
    return `${normalized}.SA`;
  return null;
}

function numberOr(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeProviderTimestamp(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value < 10_000_000_000 ? value * 1000 : value);
    if (!Number.isNaN(date.valueOf())) return date.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    if (!Number.isNaN(date.valueOf())) return date.toISOString();
  }
  return new Date().toISOString();
}

function optionalNumber(...values: unknown[]) {
  for (const value of values) {
    const numeric = Number(value);
    if (value !== null && value !== undefined && Number.isFinite(numeric))
      return numeric;
  }
  return undefined;
}

function normalizeQuote(
  ticker: string,
  price: unknown,
  changePercent: unknown,
  volume: unknown,
  open: unknown,
  high: unknown,
  low: unknown,
  source: ProviderQuote["source"],
  providerAsOf?: unknown
): ProviderQuote | null {
  const normalizedPrice = numberOr(price);
  if (!normalizedPrice) return null;
  const normalizedVolume = optionalNumber(volume);
  const asOf = normalizeProviderTimestamp(providerAsOf);
  return {
    ticker,
    price: normalizedPrice,
    changePercent: optionalNumber(changePercent) ?? null,
    volume:
      normalizedVolume !== undefined && normalizedVolume > 0
        ? normalizedVolume
        : null,
    open: optionalNumber(open) ?? null,
    high: optionalNumber(high) ?? null,
    low: optionalNumber(low) ?? null,
    source,
    asOf,
    freshness: "delayed",
    isDemo: false,
  };
}

async function fetchBrapiPayload(ticker: string, extra = "") {
  const token = process.env.BRAPI_API_KEY;
  const queryParts: string[] = [];
  if (token) queryParts.push(`token=${encodeURIComponent(token)}`);
  if (extra) queryParts.push(extra.replace(/^[&?]/, ""));
  const qs = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
  return fetchJson(
    `https://brapi.dev/api/quote/${encodeURIComponent(ticker)}${qs}`,
    token ? { Authorization: `Bearer ${token}` } : {}
  );
}

async function fetchBrapi(ticker: string, assetType: string) {
  let symbol = quoteSymbol(ticker, assetType, "brapi");
  if (!symbol && ticker.toUpperCase() === "BZ=F") symbol = "BZ=F";
  if (!symbol) return null;
  const payload = await fetchBrapiPayload(symbol);
  const quote = payload?.results?.[0];
  return normalizeQuote(
    ticker,
    quote?.regularMarketPrice,
    quote?.regularMarketChangePercent,
    quote?.regularMarketVolume,
    quote?.regularMarketOpen,
    quote?.regularMarketDayHigh,
    quote?.regularMarketDayLow,
    "brapi",
    quote?.regularMarketTime
  );
}

async function fetchTwelveData(ticker: string, assetType: string) {
  const token = process.env.TWELVE_DATA_API_KEY;
  const symbol = quoteSymbol(ticker, assetType, "twelve-data");
  if (!token || !symbol) return null;
  const payload = await fetchJson(
    `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(token)}`
  );
  return normalizeQuote(
    ticker,
    payload?.close ?? payload?.price,
    payload?.percent_change,
    payload?.volume,
    payload?.open,
    payload?.high,
    payload?.low,
    "twelve-data",
    payload?.datetime ?? payload?.timestamp
  );
}

async function fetchFinnhub(ticker: string, assetType: string) {
  const token = process.env.FINNHUB_API_KEY;
  const symbol = quoteSymbol(ticker, assetType, "finnhub");
  if (!token || !symbol) return null;
  const payload = await fetchJson(
    `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(token)}`
  );
  return normalizeQuote(
    ticker,
    payload?.c,
    payload?.dp,
    payload?.v,
    payload?.o,
    payload?.h,
    payload?.l,
    "finnhub",
    payload?.t
  );
}

async function fetchCoinGecko(ticker: string, assetType: string) {
  if (assetType.toUpperCase() !== "CRYPTO") return null;
  const id = coinGeckoId(ticker);
  const config = coinGeckoConfig();
  if (!id || !config) return null;
  const payload = await fetchJson(
    `${config.baseUrl}/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true`,
    { [config.header]: config.apiKey },
    20_000
  );
  const value = payload?.[id];
  const price = numberOr(value?.usd);
  const changePercent = numberOr(value?.usd_24h_change);
  return normalizeQuote(
    ticker,
    price,
    changePercent,
    value?.usd_24h_vol,
    null,
    null,
    null,
    "coingecko",
    value?.last_updated_at
  );
}

async function fetchEodhd(ticker: string, assetType: string) {
  const token = process.env.EODHD_API_TOKEN;
  let symbol = eodhdSymbol(ticker, assetType);
  if (!symbol && ticker.toUpperCase() === "SPX") symbol = "GSPC.INDX";
  if (!symbol && ticker.toUpperCase() === "IXIC") symbol = "IXIC.INDX";
  if (!token || !symbol) return null;
  const payload = await fetchJson(
    `https://eodhd.com/api/real-time/${encodeURIComponent(symbol)}?api_token=${encodeURIComponent(token)}&fmt=json`,
    {},
    60_000
  );
  const close = payload?.close;
  const previousClose = optionalNumber(payload?.previousClose);
  const changePercent =
    payload?.change_p ??
    (previousClose
      ? ((numberOr(close) - previousClose) / previousClose) * 100
      : null);
  return normalizeQuote(
    ticker,
    close,
    changePercent,
    payload?.volume,
    payload?.open,
    payload?.high,
    payload?.low,
    "eodhd",
    payload?.timestamp
  );
}

export async function fetchLiveQuote(
  ticker: string,
  assetType: string
): Promise<ProviderQuote | null> {
  const cacheKey = `${ticker.toUpperCase()}|${assetType.toUpperCase()}`;
  const cached = quoteCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.quote;
  const adapters: Record<QuoteProvider, () => Promise<ProviderQuote | null>> = {
    brapi: () => fetchBrapi(ticker, assetType),
    "twelve-data": () => fetchTwelveData(ticker, assetType),
    finnhub: () => fetchFinnhub(ticker, assetType),
    coingecko: () => fetchCoinGecko(ticker, assetType),
    eodhd: () => fetchEodhd(ticker, assetType),
  };
  const quote = await firstSuccessful(
    marketSourceOrder("quote", { assetType }),
    source => adapters[source](),
    result => Boolean(result)
  );
  quoteCache.set(cacheKey, {
    expiresAt: Date.now() + quoteCacheTtlMs,
    quote,
  });
  return quote;
}

async function firstSuccessful<T>(
  sources: readonly QuoteProvider[],
  execute: (source: QuoteProvider) => Promise<T>,
  accepts: (result: T) => boolean
) {
  for (const source of sources) {
    const result = await execute(source);
    if (accepts(result)) return result;
  }
  return null;
}

function normalizeCandle(
  source: ProviderCandle["source"],
  time: unknown,
  open: unknown,
  high: unknown,
  low: unknown,
  close: unknown,
  volume: unknown
): ProviderCandle | null {
  const timestamp =
    typeof time === "number"
      ? new Date(time < 10_000_000_000 ? time * 1000 : time)
      : new Date(String(time));
  const normalizedClose = optionalNumber(close);
  const normalizedOpen = optionalNumber(open);
  const normalizedHigh = optionalNumber(high);
  const normalizedLow = optionalNumber(low);
  if (
    !normalizedClose ||
    normalizedOpen === undefined ||
    normalizedHigh === undefined ||
    normalizedLow === undefined ||
    Number.isNaN(timestamp.valueOf())
  ) return null;
  return {
    time: timestamp,
    open: normalizedOpen,
    high: normalizedHigh,
    low: normalizedLow,
    close: normalizedClose,
    volume: (() => {
      const value = optionalNumber(volume);
      return value !== undefined && value > 0 ? value : null;
    })(),
    source,
  };
}

function intervalToTwelveData(interval: string) {
  if (interval === "1W") return "1week";
  if (interval === "1M") return "1month";
  return "1day";
}

async function fetchBrapiHistory(ticker: string, outputsize = 180) {
  const symbol = catalogProviderSymbols[ticker.toUpperCase()]?.brapi ?? ticker;
  const payload = await fetchBrapiPayload(symbol, `&range=5y&interval=1d`);
  const values =
    payload?.results?.[0]?.historicalDataPrice ??
    payload?.results?.[0]?.historicalData ??
    [];
  const normalized = values
    .map((row: any) =>
      normalizeCandle(
        "brapi",
        row.date ?? row.timestamp,
        row.open,
        row.high,
        row.low,
        row.close ?? row.adjclose,
        row.volume
      )
    )
    .filter(
      (candle: ProviderCandle | null): candle is ProviderCandle =>
        candle !== null
    );
  normalized.sort(
    (a: ProviderCandle, b: ProviderCandle) =>
      a.time.valueOf() - b.time.valueOf()
  );
  return normalized.slice(-outputsize);
}

async function fetchTwelveDataHistory(
  ticker: string,
  interval: string,
  outputsize = 180
) {
  const token = process.env.TWELVE_DATA_API_KEY;
  if (!token) return [];
  const payload = await fetchJson(
    `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(ticker)}&interval=${intervalToTwelveData(interval)}&outputsize=${outputsize}&apikey=${encodeURIComponent(token)}`
  );
  const normalized = (payload?.values ?? [])
    .map((row: any) =>
      normalizeCandle(
        "twelve-data",
        row.datetime,
        row.open,
        row.high,
        row.low,
        row.close,
        row.volume
      )
    )
    .filter(
      (candle: ProviderCandle | null): candle is ProviderCandle =>
        candle !== null
    );
  normalized.sort(
    (a: ProviderCandle, b: ProviderCandle) =>
      a.time.valueOf() - b.time.valueOf()
  );
  return normalized.slice(-outputsize);
}

async function fetchFinnhubHistory(ticker: string, outputsize = 180) {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) return [];
  const to = Math.floor(Date.now() / 1000);
  const from = to - Math.max(outputsize, 30) * 86400;
  const payload = await fetchJson(
    `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(ticker)}&resolution=D&from=${from}&to=${to}&token=${encodeURIComponent(token)}`
  );
  if (payload?.s !== "ok") return [];
  const normalized = (payload?.t ?? [])
    .map((time: number, index: number) =>
      normalizeCandle(
        "finnhub",
        time,
        payload.o?.[index],
        payload.h?.[index],
        payload.l?.[index],
        payload.c?.[index],
        payload.v?.[index]
      )
    )
    .filter(
      (candle: ProviderCandle | null): candle is ProviderCandle =>
        candle !== null
    );
  normalized.sort(
    (a: ProviderCandle, b: ProviderCandle) =>
      a.time.valueOf() - b.time.valueOf()
  );
  return normalized.slice(-outputsize);
}

function coinGeckoOhlcDays(outputsize: number) {
  if (outputsize <= 7) return 7;
  if (outputsize <= 14) return 14;
  if (outputsize <= 30) return 30;
  if (outputsize <= 90) return 90;
  if (outputsize <= 180) return 180;
  return 365;
}

async function fetchCoinGeckoHistory(
  ticker: string,
  assetType: string,
  outputsize = 180
) {
  if (assetType.toUpperCase() !== "CRYPTO") return [];
  const id = coinGeckoId(ticker);
  const config = coinGeckoConfig();
  if (!id || !config) return [];
  const days = coinGeckoOhlcDays(outputsize);
  const payload = await fetchJson(
    `${config.baseUrl}/coins/${encodeURIComponent(id)}/ohlc?vs_currency=usd&days=${days}`,
    { [config.header]: config.apiKey },
    15 * 60_000
  );
  if (!Array.isArray(payload)) return [];
  return payload
    .map((row: unknown[]) =>
      normalizeCandle(
        "coingecko",
        row?.[0],
        row?.[1],
        row?.[2],
        row?.[3],
        row?.[4],
        null
      )
    )
    .filter(
      (candle: ProviderCandle | null): candle is ProviderCandle =>
        candle !== null
    )
    .slice(-outputsize);
}

async function fetchEodhdHistory(
  ticker: string,
  assetType: string,
  outputsize = 180
) {
  const token = process.env.EODHD_API_TOKEN;
  const symbol = eodhdSymbol(ticker, assetType);
  if (!token || !symbol) return [];
  const from = new Date(Date.now() - Math.max(outputsize * 2, 30) * 86400000)
    .toISOString()
    .slice(0, 10);
  const payload = await fetchJson(
    `https://eodhd.com/api/eod/${encodeURIComponent(symbol)}?api_token=${encodeURIComponent(token)}&fmt=json&period=d&order=a&from=${from}`,
    {},
    15 * 60_000
  );
  if (!Array.isArray(payload)) return [];
  return payload
    .map((row: any) =>
      normalizeCandle(
        "eodhd",
        row.date,
        row.open,
        row.high,
        row.low,
        row.adjusted_close ?? row.close,
        row.volume
      )
    )
    .filter(
      (candle: ProviderCandle | null): candle is ProviderCandle =>
        candle !== null
    )
    .slice(-outputsize);
}

export async function fetchHistoricalCandles(
  ticker: string,
  assetType: string,
  interval = "1D",
  outputsize = 180
) {
  const adapters: Record<QuoteProvider, () => Promise<ProviderCandle[]>> = {
    brapi: () =>
      quoteSymbol(ticker, assetType, "brapi")
        ? fetchBrapiHistory(ticker, outputsize)
        : Promise.resolve([]),
    "twelve-data": () => fetchTwelveDataHistory(ticker, interval, outputsize),
    finnhub: () => fetchFinnhubHistory(ticker, outputsize),
    coingecko: () => fetchCoinGeckoHistory(ticker, assetType, outputsize),
    eodhd: () => fetchEodhdHistory(ticker, assetType, outputsize),
  };
  return (
    (await firstSuccessful(
      marketSourceOrder("history", { assetType }),
      source => adapters[source](),
      result => result.length > 0
    )) ?? []
  );
}

function normalizeFundamentals(
  ticker: string,
  source: Exclude<ProviderSource, "catalog">,
  values: Record<string, unknown>
) {
  const result: ProviderFundamentals = {
    ticker,
    source,
    asOf: new Date().toISOString(),
    peRatio: optionalNumber(values.peRatio, values.pe, values.priceEarnings),
    pbRatio: optionalNumber(values.pbRatio, values.pb, values.priceToBook),
    dividendYield: optionalNumber(values.dividendYield, values.dy),
    roe: optionalNumber(values.roe, values.returnOnEquity),
    netMargin: optionalNumber(values.netMargin, values.netProfitMargin),
    enterpriseValue: optionalNumber(values.enterpriseValue, values.ev),
    ebitda: optionalNumber(values.ebitda, values.ebitdaTtm),
    netDebt: optionalNumber(values.netDebt, values.netDebtTtm),
    freeCashFlow: optionalNumber(
      values.freeCashFlow,
      values.fcf,
      values.freeCashFlowTtm
    ),
    earningsGrowth: optionalNumber(
      values.earningsGrowth,
      values.epsGrowth,
      values.earningsGrowthTtm
    ),
    revenueGrowth: optionalNumber(
      values.revenueGrowth,
      values.revenueGrowthTtm
    ),
  };
  return Object.values(result).some(value => typeof value === "number")
    ? result
    : null;
}

async function fetchBrapiFundamentals(ticker: string) {
  const quote = (
    await fetchBrapiPayload(
      ticker,
      "&modules=financialData,defaultKeyStatistics"
    )
  )?.results?.[0];
  if (!quote) return null;
  const fin = (quote.financialData ?? {}) as Record<string, unknown>;
  const stats = (quote.defaultKeyStatistics ?? {}) as Record<string, unknown>;
  const totalDebt = optionalNumber(fin.totalDebt);
  const totalCash = optionalNumber(fin.totalCash);
  const netDebt =
    typeof totalDebt === "number" && typeof totalCash === "number"
      ? totalDebt - totalCash
      : null;
  return normalizeFundamentals(ticker, "brapi", {
    ...quote,
    peRatio: quote.priceEarnings ?? stats.trailingPE,
    pbRatio: quote.priceToBook ?? stats.priceToBook,
    dividendYield: quote.dividendYield ?? stats.dividendYield ?? stats.yield,
    roe: fin.returnOnEquity ?? stats.returnOnEquity,
    netMargin: fin.profitMargins ?? stats.profitMargins,
    enterpriseValue: stats.enterpriseValue,
    ebitda: fin.ebitda,
    netDebt,
    freeCashFlow: fin.freeCashflow,
    earningsGrowth: fin.earningsGrowth ?? stats.earningsQuarterlyGrowth,
    revenueGrowth: fin.revenueGrowth,
  });
}

async function fetchTwelveDataFundamentals(ticker: string) {
  const token = process.env.TWELVE_DATA_API_KEY;
  if (!token) return null;
  const payload = await fetchJson(
    `https://api.twelvedata.com/statistics?symbol=${encodeURIComponent(ticker)}&apikey=${encodeURIComponent(token)}`
  );
  const source = {
    ...(payload?.valuations ?? {}),
    ...(payload?.statistics ?? {}),
    ...payload,
  };
  return normalizeFundamentals(ticker, "twelve-data", {
    pe: source.pe_ratio ?? source.pe_ratio_ttm,
    pb: source.price_to_book_mrq ?? source.pb_ratio,
    dividendYield: source.dividend_yield_ttm ?? source.dividend_yield,
    roe: source.return_on_equity_ttm ?? source.roe,
    netProfitMargin: source.net_profit_margin_ttm ?? source.net_profit_margin,
    enterpriseValue: source.enterprise_value ?? source.ev,
    ebitda: source.ebitda_ttm ?? source.ebitda,
    netDebt: source.net_debt ?? source.net_debt_ttm,
    freeCashFlow: source.free_cash_flow_ttm ?? source.free_cash_flow,
    earningsGrowth: source.earnings_growth_ttm ?? source.eps_growth,
    revenueGrowth: source.revenue_growth_ttm ?? source.revenue_growth,
  });
}

async function fetchFinnhubFundamentals(ticker: string) {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) return null;
  const payload = await fetchJson(
    `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(ticker)}&metric=all&token=${encodeURIComponent(token)}`
  );
  const metric = payload?.metric ?? {};
  return normalizeFundamentals(ticker, "finnhub", {
    pe: metric.peBasicExclExtraTTM,
    pb: metric.pbAnnual,
    dividendYield: metric.dividendYieldIndicatedAnnual,
    roe: metric.roeTTM,
    netProfitMargin: metric.netProfitMarginTTM,
    enterpriseValue: metric.ev,
    ebitda: metric.ebitdaTTM,
    netDebt: metric.netDebt,
    freeCashFlow: metric.freeCashFlowTTM,
    earningsGrowth: metric.epsGrowthTTMYoy,
    revenueGrowth: metric.revenueGrowthTTMYoy,
  });
}

export async function fetchFundamentals(ticker: string, assetType: string) {
  const adapters: Record<
    QuoteProvider,
    () => Promise<ProviderFundamentals | null>
  > = {
    brapi: () => fetchBrapiFundamentals(ticker),
    "twelve-data": () => fetchTwelveDataFundamentals(ticker),
    finnhub: () => fetchFinnhubFundamentals(ticker),
    coingecko: () => Promise.resolve(null),
    // The validated EODHD plan returns 403 for fundamentals. Keep this adapter
    // disabled until that module is explicitly enabled in configuration.
    eodhd: () => Promise.resolve(null),
  };
  return firstSuccessful(
    marketSourceOrder("fundamentals", { assetType }),
    source => adapters[source](),
    result => Boolean(result)
  );
}

function approvedProviderNewsUrl(value: unknown) {
  try {
    const parsed = new URL(String(value ?? ""));
    return parsed.protocol === "https:" && parsed.hostname
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

function providerNewsDate(value: unknown) {
  const date =
    typeof value === "number"
      ? new Date(value < 10_000_000_000 ? value * 1000 : value)
      : new Date(String(value ?? ""));
  return Number.isNaN(date.valueOf()) ? null : date;
}

export function normalizeProviderNewsItem(
  item: any,
  source: Exclude<ProviderSource, "catalog">,
  ticker: string,
  defaults: {
    title?: unknown;
    summary?: unknown;
    date?: unknown;
    url?: unknown;
  } = {}
): ProviderNewsItem | null {
  const headline = String(item?.headline ?? item?.title ?? defaults.title ?? "")
    .trim()
    .slice(0, 240);
  const url = approvedProviderNewsUrl(item?.url ?? defaults.url);
  const publishedAt = providerNewsDate(
    item?.datetime ?? item?.published_at ?? defaults.date
  );
  if (!headline || !url || !publishedAt) return null;
  const rawSummary = item?.summary ?? item?.description ?? defaults.summary;
  const summary = rawSummary
    ? String(rawSummary).trim().slice(0, 600)
    : undefined;
  return {
    headline,
    summary,
    sourceName:
      String(item?.source ?? item?.sourceName ?? source).trim() || source,
    url,
    image: typeof item?.image === "string" ? item.image : undefined,
    publishedAt,
    relatedTicker: ticker,
    source,
  };
}

function deduplicateProviderNews(items: Array<ProviderNewsItem | null>) {
  return Array.from(
    new Map(
      items
        .filter((item): item is ProviderNewsItem => Boolean(item))
        .map(item => [item.url, item])
    ).values()
  ).slice(0, 20);
}

export async function fetchProviderNews(ticker: string, days = 7) {
  const finnhubToken = process.env.FINNHUB_API_KEY;
  const twelveToken = process.env.TWELVE_DATA_API_KEY;
  const now = new Date();
  const from = new Date(now.getTime() - days * 86400000)
    .toISOString()
    .slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  const sourceOrder = marketSourceOrder("company-news");
  if (sourceOrder.includes("finnhub") && finnhubToken) {
    const payload = await fetchJson(
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}&from=${from}&to=${to}&token=${encodeURIComponent(finnhubToken)}`
    );
    if (Array.isArray(payload)) {
      return deduplicateProviderNews(
        payload
          .slice(0, 20)
          .map((item: any) =>
            normalizeProviderNewsItem(item, "finnhub", ticker)
          )
      );
    }
  }
  if (sourceOrder.includes("twelve-data") && twelveToken) {
    const payload = await fetchJson(
      `https://api.twelvedata.com/news?symbol=${encodeURIComponent(ticker)}&outputsize=20&apikey=${encodeURIComponent(twelveToken)}`
    );
    const values = payload?.data ?? payload?.news;
    if (Array.isArray(values))
      return deduplicateProviderNews(
        values.map((item: any) =>
          normalizeProviderNewsItem(item, "twelve-data", ticker)
        )
      );
  }
  return [] as ProviderNewsItem[];
}

export async function fetchEconomicCalendar(days = 180) {
  // Brazilian product calendar: the official BCB schedule is authoritative.
  // International provider calendars must be exposed by a separate use case,
  // never silently replace Brazilian official events because a token exists.
  return listOfficialBcbEvents(days);
}

// Fonte: calendário oficial de reuniões do Copom publicado pelo Banco
// Central (https://www.bcb.gov.br/publicacoes/atascopom /
// https://www.bcb.gov.br/controleinflacao/relatoriopoliticamonetaria).
// O BCB divulga esse calendário com cerca de um ano de antecedência, por
// isso mantemos a lista como referência manual em vez de depender de um
// endpoint estruturado (o BCB não publica um). `assertOfficialBcbScheduleFreshness`
// abaixo transforma o risco de "ficar desatualizado silenciosamente" em um
// alerta operacional visível nos logs quando a cobertura estiver acabando.
// Última atualização manual desta lista: 2026-09-14.
const officialBcbSchedule = [
  ["2026-09-16T18:30:00-03:00", "Decisão de juros — Copom", "Juros"],
  ["2026-09-22T08:00:00-03:00", "Ata da reunião do Copom", "Juros"],
  [
    "2026-09-24T08:00:00-03:00",
    "Relatório de Política Monetária — 3º trimestre",
    "Inflação",
  ],
  ["2026-11-04T18:30:00-03:00", "Decisão de juros — Copom", "Juros"],
  ["2026-11-10T08:00:00-03:00", "Ata da reunião do Copom", "Juros"],
  ["2026-12-09T18:30:00-03:00", "Decisão de juros — Copom", "Juros"],
  ["2026-12-15T08:00:00-03:00", "Ata da reunião do Copom", "Juros"],
  ["2027-01-27T18:30:00-03:00", "Decisão de juros — Copom", "Juros"],
  ["2027-02-02T08:00:00-03:00", "Ata da reunião do Copom", "Juros"],
  ["2027-03-17T18:30:00-03:00", "Decisão de juros — Copom", "Juros"],
  ["2027-03-23T08:00:00-03:00", "Ata da reunião do Copom", "Juros"],
  ["2027-04-28T18:30:00-03:00", "Decisão de juros — Copom", "Juros"],
  ["2027-05-04T08:00:00-03:00", "Ata da reunião do Copom", "Juros"],
  ["2027-06-16T18:30:00-03:00", "Decisão de juros — Copom", "Juros"],
  ["2027-06-22T08:00:00-03:00", "Ata da reunião do Copom", "Juros"],
  ["2027-08-04T18:30:00-03:00", "Decisão de juros — Copom", "Juros"],
  ["2027-08-10T08:00:00-03:00", "Ata da reunião do Copom", "Juros"],
  ["2027-09-22T18:30:00-03:00", "Decisão de juros — Copom", "Juros"],
  ["2027-09-28T08:00:00-03:00", "Ata da reunião do Copom", "Juros"],
  ["2027-10-27T18:30:00-03:00", "Decisão de juros — Copom", "Juros"],
  ["2027-11-03T08:00:00-03:00", "Ata da reunião do Copom", "Juros"],
  ["2027-12-08T18:30:00-03:00", "Decisão de juros — Copom", "Juros"],
  ["2027-12-14T08:00:00-03:00", "Ata da reunião do Copom", "Juros"],
] as const;

export const BCB_SCHEDULE_COVERAGE_WARNING_DAYS = 60;
let warnedStaleOfficialBcbSchedule = false;

/**
 * Verifica se a lista manual de eventos do Copom ainda cobre um horizonte
 * seguro à frente de `now`. Quando a cobertura cai abaixo de
 * `BCB_SCHEDULE_COVERAGE_WARNING_DAYS`, emite um alerta estruturado (uma
 * única vez por processo) em vez de deixar o calendário ficar desatualizado
 * silenciosamente. Retorna a data do último evento e se o alerta é devido,
 * para permitir testes determinísticos.
 */
export function assertOfficialBcbScheduleFreshness(now = new Date()) {
  const lastScheduledDate = new Date(
    officialBcbSchedule[officialBcbSchedule.length - 1][0]
  );
  const warningThreshold = new Date(
    now.getTime() + BCB_SCHEDULE_COVERAGE_WARNING_DAYS * 86_400_000
  );
  const needsUpdate = lastScheduledDate <= warningThreshold;
  if (needsUpdate && !warnedStaleOfficialBcbSchedule) {
    warnedStaleOfficialBcbSchedule = true;
    logger.warn("official-bcb-schedule-needs-update", {
      lastScheduledDate: lastScheduledDate.toISOString(),
      warningThresholdDays: BCB_SCHEDULE_COVERAGE_WARNING_DAYS,
    });
  }
  return { lastScheduledDate, needsUpdate };
}

export function listOfficialBcbEvents(days = 180, now = new Date()) {
  const end = new Date(now.getTime() + days * 86_400_000);
  assertOfficialBcbScheduleFreshness(now);
  return officialBcbSchedule
    .map(([date, title, category]) => ({
      title,
      category,
      country: "BR",
      importance: "HIGH",
      eventDate: new Date(date),
      forecast: undefined,
      previous: undefined,
      source: "bcb" as const,
    }))
    .filter(event => event.eventDate >= now && event.eventDate <= end);
}

export function getProviderStatus(): ProviderStatus {
  return {
    brapi: Boolean(process.env.BRAPI_API_KEY),
    twelveData: Boolean(process.env.TWELVE_DATA_API_KEY),
    finnhub: Boolean(process.env.FINNHUB_API_KEY),
    coinGecko: Boolean(process.env.COINGECKO_API_KEY),
    eodhd: Boolean(process.env.EODHD_API_TOKEN),
    resend: Boolean(
      process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL
    ),
  };
}
