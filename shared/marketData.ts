export type MarketDataSource =
  | "brapi"
  | "twelve-data"
  | "finnhub"
  | "catalog"
  | "tesouro-direto"
  | "b3"
  | "cvm"
  | "bcb"
  | "ibge";
export type MarketDataFreshness = "live" | "delayed" | "close" | "demo" | "official";

export type MarketDataMeta = {
  source: MarketDataSource;
  asOf: string;
  freshness: MarketDataFreshness;
  isDemo: boolean;
};

export type CanonicalQuote = MarketDataMeta & {
  ticker: string;
  price: number;
  changePercent: number;
  volume: number;
  open: number;
  high: number;
  low: number;
};

export function catalogQuoteFromAsset(asset: {
  ticker: string;
  lastPrice?: unknown;
  changePercent?: unknown;
  dayVolume?: unknown;
  updatedAt?: string | number | Date | null;
}): CanonicalQuote {
  const price = finiteNumber(asset.lastPrice);
  const asOf = asset.updatedAt
    ? new Date(asset.updatedAt).toISOString()
    : new Date(0).toISOString();
  return {
    ticker: asset.ticker,
    price,
    changePercent: finiteNumber(asset.changePercent),
    volume: finiteNumber(asset.dayVolume),
    open: price,
    high: price,
    low: price,
    source: "catalog",
    asOf,
    freshness: "demo",
    isDemo: true,
  };
}

function finiteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
