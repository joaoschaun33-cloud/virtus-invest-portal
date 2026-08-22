import { marketSourceOrder, type MarketProviderId } from "./dataSourcePolicy";
import type { MarketDataFreshness } from "../shared/marketData";

export type ProviderSource = "brapi" | "twelve-data" | "finnhub" | "catalog";

export type ProviderQuote = {
  ticker: string;
  price: number;
  changePercent: number;
  volume: number;
  open: number;
  high: number;
  low: number;
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
  volume: number;
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
};

const timeoutMs = 6500;
const responseCache = new Map<
  string,
  { expiresAt: number; payload: unknown }
>();
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
  return (["brapi", "twelve-data", "finnhub"] as const).some(provider =>
    Boolean(quoteSymbol(ticker, assetType, provider))
  );
}

async function fetchJson(
  url: string,
  headers: Record<string, string> = {}
): Promise<any | null> {
  const cacheKey = `${url}|${headers.Authorization ? "authenticated" : "public"}`;
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.payload;
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
      expiresAt: Date.now() + responseCacheTtlMs,
      payload,
    });
    return payload;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
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
  const asOf = normalizeProviderTimestamp(providerAsOf);
  return {
    ticker,
    price: normalizedPrice,
    changePercent: numberOr(changePercent),
    volume: numberOr(volume),
    open: numberOr(open, normalizedPrice),
    high: numberOr(high, normalizedPrice),
    low: numberOr(low, normalizedPrice),
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
  const symbol = quoteSymbol(ticker, assetType, "brapi");
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
  const normalizedClose = numberOr(close);
  if (!normalizedClose || Number.isNaN(timestamp.valueOf())) return null;
  return {
    time: timestamp,
    open: numberOr(open, normalizedClose),
    high: numberOr(high, normalizedClose),
    low: numberOr(low, normalizedClose),
    close: normalizedClose,
    volume: numberOr(volume),
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
  const values = (
    payload?.results?.[0]?.historicalDataPrice ??
    payload?.results?.[0]?.historicalData ??
    []
  );
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
    .filter((candle: ProviderCandle | null): candle is ProviderCandle => candle !== null);
  normalized.sort((a: ProviderCandle, b: ProviderCandle) => a.time.valueOf() - b.time.valueOf());
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
    .filter((candle: ProviderCandle | null): candle is ProviderCandle => candle !== null);
  normalized.sort((a: ProviderCandle, b: ProviderCandle) => a.time.valueOf() - b.time.valueOf());
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
    .filter((candle: ProviderCandle | null): candle is ProviderCandle => candle !== null);
  normalized.sort((a: ProviderCandle, b: ProviderCandle) => a.time.valueOf() - b.time.valueOf());
  return normalized.slice(-outputsize);
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
  const quote = (await fetchBrapiPayload(ticker))?.results?.[0];
  return quote ? normalizeFundamentals(ticker, "brapi", quote) : null;
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
  };
  return firstSuccessful(
    marketSourceOrder("fundamentals", { assetType }),
    source => adapters[source](),
    result => Boolean(result)
  );
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
      return payload.slice(0, 20).map((item: any) => ({
        headline: String(item.headline ?? "Notícia de mercado"),
        summary: item.summary,
        sourceName: String(item.source ?? "Finnhub"),
        url: String(item.url ?? "https://finnhub.io/"),
        image: item.image,
        publishedAt: new Date(numberOr(item.datetime) * 1000),
        relatedTicker: ticker,
        source: "finnhub" as const,
      }));
    }
  }
  if (sourceOrder.includes("twelve-data") && twelveToken) {
    const payload = await fetchJson(
      `https://api.twelvedata.com/news?symbol=${encodeURIComponent(ticker)}&outputsize=20&apikey=${encodeURIComponent(twelveToken)}`
    );
    const values = payload?.data ?? payload?.news;
    if (Array.isArray(values))
      return values.map((item: any) => ({
        headline: String(item.title ?? item.headline ?? "Notícia de mercado"),
        summary: item.description ?? item.summary,
        sourceName: String(item.source ?? "Twelve Data"),
        url: String(item.url ?? "https://twelvedata.com/"),
        image: item.image,
        publishedAt: new Date(item.datetime ?? item.published_at ?? Date.now()),
        relatedTicker: ticker,
        source: "twelve-data" as const,
      }));
  }
  return [] as ProviderNewsItem[];
}

export async function fetchEconomicCalendar(days = 180) {
  // Brazilian product calendar: the official BCB schedule is authoritative.
  // International provider calendars must be exposed by a separate use case,
  // never silently replace Brazilian official events because a token exists.
  return listOfficialBcbEvents(days);
}

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

export function listOfficialBcbEvents(days = 180, now = new Date()) {
  const end = new Date(now.getTime() + days * 86_400_000);
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
    resend: Boolean(
      process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL
    ),
  };
}
