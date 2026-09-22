export type MarketDataSource =
  | "brapi"
  | "twelve-data"
  | "finnhub"
  | "coingecko"
  | "eodhd"
  | "binance"
  | "catalog"
  | "tesouro-direto"
  | "b3"
  | "cvm"
  | "bcb"
  | "ibge";
export type MarketDataFreshness =
  | "live"
  | "delayed"
  | "close"
  | "demo"
  | "official"
  | "stale"
  | "unavailable";

export type MarketDataMeta = {
  source: MarketDataSource;
  asOf: string;
  freshness: MarketDataFreshness;
  isDemo: boolean;
};

export type CanonicalQuote = MarketDataMeta & {
  ticker: string;
  price: number | null;
  changePercent: number | null;
  volume: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
};

export function catalogQuoteFromAsset(asset: {
  ticker: string;
  lastPrice?: unknown;
  changePercent?: unknown;
  dayVolume?: unknown;
  updatedAt?: string | number | Date | null;
  source?: unknown;
}): CanonicalQuote {
  const price = finiteNumberOrNull(asset.lastPrice);
  const changePercent = finiteNumberOrNull(asset.changePercent);
  const rawVolume = finiteNumberOrNull(asset.dayVolume);
  const volume = rawVolume !== null && rawVolume > 0 ? rawVolume : null;
  const hasValue = price !== null;
  const source = marketDataSource(asset.source);
  const isCatalog = source === "catalog";
  const asOf = asset.updatedAt
    ? new Date(asset.updatedAt).toISOString()
    : new Date(0).toISOString();
  return {
    ticker: asset.ticker,
    price,
    changePercent,
    volume,
    open: null,
    high: null,
    low: null,
    source,
    asOf,
    freshness: !hasValue ? "unavailable" : isCatalog ? "demo" : "close",
    isDemo: hasValue && isCatalog,
  };
}

function marketDataSource(value: unknown): MarketDataSource {
  const known: MarketDataSource[] = [
    "brapi",
    "twelve-data",
    "finnhub",
    "coingecko",
    "eodhd",
    "binance",
    "catalog",
    "tesouro-direto",
    "b3",
    "cvm",
    "bcb",
    "ibge",
  ];
  return known.includes(value as MarketDataSource)
    ? (value as MarketDataSource)
    : "catalog";
}

function finiteNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
