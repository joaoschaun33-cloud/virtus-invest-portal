import { DATA_SOURCES, type DataSourceId } from "../shared/dataSources";

export type MarketProviderId =
  | "brapi"
  | "twelve-data"
  | "finnhub"
  | "coingecko"
  | "eodhd";
export type DataCapability =
  | "quote"
  | "history"
  | "fundamentals"
  | "company-news"
  | "economic-calendar";

type MarketContext = {
  assetType?: string;
  publicDisplay?: boolean;
};

const B3_ASSET_TYPES = new Set(["STOCK", "REIT", "ETF", "INDEX"]);

const configured = (source: MarketProviderId) => {
  if (source === "brapi") return Boolean(process.env.BRAPI_API_KEY);
  if (source === "twelve-data") return Boolean(process.env.TWELVE_DATA_API_KEY);
  if (source === "finnhub") return Boolean(process.env.FINNHUB_API_KEY);
  if (source === "coingecko") return Boolean(process.env.COINGECKO_API_KEY);
  return Boolean(process.env.EODHD_API_TOKEN);
};

const publicDisplayApproved = (source: MarketProviderId) => {
  if (DATA_SOURCES[source].displayPolicy === "allowed") return true;
  if (source === "twelve-data")
    return process.env.TWELVE_DATA_PUBLIC_DISPLAY === "true";
  if (source === "finnhub")
    return process.env.FINNHUB_PUBLIC_DISPLAY === "true";
  if (source === "eodhd") return process.env.EODHD_PUBLIC_DISPLAY === "true";
  return process.env.COINGECKO_PUBLIC_DISPLAY === "true";
};

export function isSourceEligible(
  source: MarketProviderId,
  context: MarketContext = {}
) {
  // brapi exposes a small public sandbox even without a token. The adapter is
  // responsible for deciding whether the requested ticker belongs to it.
  if (source !== "brapi" && !configured(source)) return false;
  return context.publicDisplay === false || publicDisplayApproved(source);
}

export function isStoredSourcePubliclyDisplayable(source: unknown) {
  const normalized = String(source ?? "").toLowerCase();
  const providers: MarketProviderId[] = [
    "brapi",
    "twelve-data",
    "finnhub",
    "coingecko",
    "eodhd",
  ];
  if (providers.includes(normalized as MarketProviderId))
    return isSourceEligible(normalized as MarketProviderId);
  const sourceDefinition = DATA_SOURCES[normalized as DataSourceId];
  return sourceDefinition?.displayPolicy === "allowed";
}

/**
 * Central source-selection policy. Product routes never choose providers.
 * Ordering expresses business authority and licensing, not token availability.
 */
export function marketSourceOrder(
  capability: Exclude<DataCapability, "economic-calendar">,
  context: MarketContext = {}
): MarketProviderId[] {
  const type = context.assetType?.toUpperCase() ?? "";
  const isB3 = B3_ASSET_TYPES.has(type);
  const isCrypto = type === "CRYPTO";
  const candidates: MarketProviderId[] = isCrypto
    ? ["coingecko", "eodhd", "twelve-data", "finnhub"]
    : isB3
      ? ["brapi", "eodhd", "twelve-data", "finnhub"]
      : ["eodhd", "twelve-data", "finnhub"];

  if (capability === "company-news") {
    return (["finnhub", "twelve-data"] as MarketProviderId[]).filter(source =>
      isSourceEligible(source, context)
    );
  }
  return candidates.filter(source => isSourceEligible(source, context));
}

export function getDataSourceGovernance() {
  const implementation: Partial<Record<DataSourceId, "active" | "planned">> = {
    bcb: "active",
    cvm: "active",
    "agencia-brasil": "active",
    brapi: "active",
    "twelve-data": "active",
    finnhub: "active",
    coingecko: "active",
    eodhd: "active",
    b3: "active",
    ibge: "active",
    "tesouro-direto": "active",
    virtus: "active",
    catalog: "active",
  };

  return Object.values(DATA_SOURCES).map(source => {
    const provider = [
      "brapi",
      "twelve-data",
      "finnhub",
      "coingecko",
      "eodhd",
    ].includes(source.id)
      ? (source.id as MarketProviderId)
      : null;
    return {
      ...source,
      implementation: implementation[source.id] ?? "planned",
      configured: provider ? configured(provider) : undefined,
      publicDisplayApproved: provider
        ? publicDisplayApproved(provider)
        : source.displayPolicy === "allowed",
    };
  });
}
