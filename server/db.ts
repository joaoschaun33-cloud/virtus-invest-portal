import { and, asc, desc, eq, inArray, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  assets,
  dividends,
  economicEvents,
  notifications,
  news,
  priceAlerts,
  quotes,
  transactions,
  userPreferences,
  users,
  watchlists,
  type InsertAsset,
  type InsertPriceAlert,
  type InsertTransaction,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { sendPriceAlertEmail } from "./email";
import {
  estimateDividendIncome,
  summarizePortfolioPerformance,
  summarizePortfolioRows,
} from "./portfolioLogic";

let _db: ReturnType<typeof drizzle> | null = null;
let seedPromise: Promise<void> | null = null;
let skipCatalogSeedForTests = false;

/** Test-only dependency injection; production code never calls these helpers. */
export function setDbForTests(db: unknown) {
  _db = db as ReturnType<typeof drizzle>;
  seedPromise = Promise.resolve();
  skipCatalogSeedForTests = true;
}

export function clearDbForTests() {
  _db = null;
  seedPromise = null;
  skipCatalogSeedForTests = false;
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(
  user: typeof users.$inferInsert
): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: typeof users.$inferInsert = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db
    .insert(users)
    .values(values)
    .onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result[0];
}

export async function deleteUserAccountData(userId: number) {
  const db = await getDb();
  if (!db)
    throw new Error("A exclusão da conta não está disponível no momento.");
  await db.transaction(async tx => {
    await tx.delete(notifications).where(eq(notifications.userId, userId));
    await tx.delete(priceAlerts).where(eq(priceAlerts.userId, userId));
    await tx.delete(transactions).where(eq(transactions.userId, userId));
    await tx.delete(watchlists).where(eq(watchlists.userId, userId));
    await tx.delete(userPreferences).where(eq(userPreferences.userId, userId));
    await tx.delete(users).where(eq(users.id, userId));
  });
}

const catalog: InsertAsset[] = [
  {
    ticker: "IBOV",
    name: "Ibovespa",
    assetType: "INDEX",
    exchange: "B3",
    currency: "BRL",
    sector: "Índices",
    source: "catalog",
    lastPrice: "132450.00",
    changePercent: "0.86",
    dayVolume: "18400000000",
  },
  {
    ticker: "SPX",
    name: "S&P 500",
    assetType: "INDEX",
    exchange: "NYSE",
    currency: "USD",
    sector: "Índices",
    source: "catalog",
    lastPrice: "5608.25",
    changePercent: "0.42",
    dayVolume: "3120000000",
  },
  {
    ticker: "IXIC",
    name: "Nasdaq Composite",
    assetType: "INDEX",
    exchange: "NASDAQ",
    currency: "USD",
    sector: "Índices",
    source: "catalog",
    lastPrice: "17735.80",
    changePercent: "0.71",
    dayVolume: "2870000000",
  },
  {
    ticker: "BTC/USD",
    name: "Bitcoin / Dólar",
    assetType: "CRYPTO",
    exchange: "GLOBAL",
    currency: "USD",
    sector: "Cripto",
    source: "catalog",
    lastPrice: "64280.10",
    changePercent: "-0.34",
    dayVolume: "28400000000",
  },
  {
    ticker: "BZ=F",
    name: "Petróleo Brent",
    assetType: "COMMODITY",
    exchange: "ICE",
    currency: "USD",
    sector: "Commodities",
    source: "catalog",
    lastPrice: "82.46",
    changePercent: "-0.18",
    dayVolume: "980000",
  },
  {
    ticker: "PETR4",
    name: "Petrobras PN",
    assetType: "STOCK",
    exchange: "B3",
    currency: "BRL",
    sector: "Petróleo e Gás",
    source: "catalog",
    lastPrice: "38.42",
    changePercent: "1.92",
    dayVolume: "72400000",
    peRatio: "5.84",
    pbRatio: "1.12",
    dividendYield: "12.40",
    roe: "21.70",
    netMargin: "18.30",
  },
  {
    ticker: "VALE3",
    name: "Vale ON",
    assetType: "STOCK",
    exchange: "B3",
    currency: "BRL",
    sector: "Mineração",
    source: "catalog",
    lastPrice: "61.18",
    changePercent: "-1.08",
    dayVolume: "51200000",
    peRatio: "6.72",
    pbRatio: "1.04",
    dividendYield: "8.80",
    roe: "15.40",
    netMargin: "22.10",
  },
  {
    ticker: "ITUB4",
    name: "Itaú Unibanco PN",
    assetType: "STOCK",
    exchange: "B3",
    currency: "BRL",
    sector: "Bancos",
    source: "catalog",
    lastPrice: "34.96",
    changePercent: "0.63",
    dayVolume: "41800000",
    peRatio: "8.92",
    pbRatio: "1.72",
    dividendYield: "6.10",
    roe: "19.80",
    netMargin: "12.70",
  },
  {
    ticker: "HGLG11",
    name: "CSHG Logística FII",
    assetType: "REIT",
    exchange: "B3",
    currency: "BRL",
    sector: "Fundos Imobiliários",
    source: "catalog",
    lastPrice: "162.74",
    changePercent: "0.28",
    dayVolume: "960000",
    peRatio: "0",
    pbRatio: "0.93",
    dividendYield: "8.90",
    roe: "10.80",
    netMargin: "62.30",
  },
  {
    ticker: "IVVB11",
    name: "iShares S&P 500 FIC",
    assetType: "ETF",
    exchange: "B3",
    currency: "BRL",
    sector: "ETFs",
    source: "catalog",
    lastPrice: "307.20",
    changePercent: "0.57",
    dayVolume: "612000",
    peRatio: "0",
    pbRatio: "1.01",
    dividendYield: "0.72",
    roe: "0",
    netMargin: "0",
  },
  {
    ticker: "BBAS3",
    name: "Banco do Brasil ON",
    assetType: "STOCK",
    exchange: "B3",
    currency: "BRL",
    sector: "Bancos",
    source: "catalog",
    lastPrice: "28.50",
    changePercent: "0.75",
    dayVolume: "35400000",
    peRatio: "4.50",
    pbRatio: "0.85",
    dividendYield: "9.20",
    roe: "21.50",
    netMargin: "14.20",
  },
  {
    ticker: "B3SA3",
    name: "B3 ON",
    assetType: "STOCK",
    exchange: "B3",
    currency: "BRL",
    sector: "Serviços Financeiros",
    source: "catalog",
    lastPrice: "12.80",
    changePercent: "1.10",
    dayVolume: "22300000",
    peRatio: "14.20",
    pbRatio: "2.35",
    dividendYield: "5.40",
    roe: "18.20",
    netMargin: "45.10",
  },
  {
    ticker: "WEGE3",
    name: "WEG ON",
    assetType: "STOCK",
    exchange: "B3",
    currency: "BRL",
    sector: "Bens Industriais",
    source: "catalog",
    lastPrice: "52.40",
    changePercent: "1.45",
    dayVolume: "28900000",
    peRatio: "32.10",
    pbRatio: "8.60",
    dividendYield: "1.80",
    roe: "31.20",
    netMargin: "16.80",
  },
  {
    ticker: "ABEV3",
    name: "Ambev ON",
    assetType: "STOCK",
    exchange: "B3",
    currency: "BRL",
    sector: "Bebidas",
    source: "catalog",
    lastPrice: "12.15",
    changePercent: "-0.40",
    dayVolume: "19800000",
    peRatio: "12.80",
    pbRatio: "2.10",
    dividendYield: "6.10",
    roe: "16.40",
    netMargin: "18.50",
  },
  {
    ticker: "RENT3",
    name: "Localiza ON",
    assetType: "STOCK",
    exchange: "B3",
    currency: "BRL",
    sector: "Locação de Veículos",
    source: "catalog",
    lastPrice: "48.90",
    changePercent: "0.85",
    dayVolume: "17600000",
    peRatio: "16.40",
    pbRatio: "1.80",
    dividendYield: "3.20",
    roe: "12.80",
    netMargin: "9.40",
  },
  {
    ticker: "MGLU3",
    name: "Magazine Luiza ON",
    assetType: "STOCK",
    exchange: "B3",
    currency: "BRL",
    sector: "Comércio Varejista",
    source: "catalog",
    lastPrice: "9.80",
    changePercent: "-1.20",
    dayVolume: "14500000",
    peRatio: "0",
    pbRatio: "0.95",
    dividendYield: "0",
    roe: "-2.10",
    netMargin: "-1.50",
  },
  {
    ticker: "KNRI11",
    name: "Kinea Renda Imobiliária FII",
    assetType: "REIT",
    exchange: "B3",
    currency: "BRL",
    sector: "Fundos Imobiliários",
    source: "catalog",
    lastPrice: "158.40",
    changePercent: "0.15",
    dayVolume: "840000",
    peRatio: "0",
    pbRatio: "0.98",
    dividendYield: "8.40",
    roe: "9.80",
    netMargin: "78.40",
  },
  {
    ticker: "MXRF11",
    name: "Maxi Renda FII",
    assetType: "REIT",
    exchange: "B3",
    currency: "BRL",
    sector: "Fundos Imobiliários",
    source: "catalog",
    lastPrice: "10.45",
    changePercent: "0.10",
    dayVolume: "12500000",
    peRatio: "0",
    pbRatio: "1.02",
    dividendYield: "12.80",
    roe: "13.20",
    netMargin: "88.50",
  },
  {
    ticker: "XPML11",
    name: "XP Malls FII",
    assetType: "REIT",
    exchange: "B3",
    currency: "BRL",
    sector: "Fundos Imobiliários",
    source: "catalog",
    lastPrice: "112.30",
    changePercent: "0.35",
    dayVolume: "3400000",
    peRatio: "0",
    pbRatio: "0.96",
    dividendYield: "9.10",
    roe: "10.50",
    netMargin: "74.20",
  },
  {
    ticker: "BTLG11",
    name: "BTG Pactual Logística FII",
    assetType: "REIT",
    exchange: "B3",
    currency: "BRL",
    sector: "Fundos Imobiliários",
    source: "catalog",
    lastPrice: "101.80",
    changePercent: "0.20",
    dayVolume: "2800000",
    peRatio: "0",
    pbRatio: "0.99",
    dividendYield: "8.80",
    roe: "10.10",
    netMargin: "81.00",
  },
  {
    ticker: "ETH/USD",
    name: "Ethereum / Dólar",
    assetType: "CRYPTO",
    exchange: "GLOBAL",
    currency: "USD",
    sector: "Cripto",
    source: "catalog",
    lastPrice: "3450.20",
    changePercent: "1.80",
    dayVolume: "14200000000",
  },
  {
    ticker: "SOL/USD",
    name: "Solana / Dólar",
    assetType: "CRYPTO",
    exchange: "GLOBAL",
    currency: "USD",
    sector: "Cripto",
    source: "catalog",
    lastPrice: "184.60",
    changePercent: "2.40",
    dayVolume: "4800000000",
  },
  {
    ticker: "EUR/USD",
    name: "Euro / Dólar",
    assetType: "FOREX",
    exchange: "FOREX",
    currency: "USD",
    sector: "Forex",
    source: "catalog",
    lastPrice: "1.0912",
    changePercent: "0.12",
    dayVolume: "0",
  },
  {
    ticker: "DXY",
    name: "Índice do Dólar",
    assetType: "INDEX",
    exchange: "ICE",
    currency: "USD",
    sector: "Índices",
    source: "catalog",
    lastPrice: "103.82",
    changePercent: "-0.08",
    dayVolume: "0",
  },
];

const demoCatalogRows: Array<typeof assets.$inferSelect> = catalog.map(
  (asset, index) => ({
    id: -(index + 1),
    ticker: asset.ticker,
    name: asset.name,
    assetType: asset.assetType,
    exchange: asset.exchange,
    currency: asset.currency ?? "BRL",
    sector: asset.sector ?? null,
    source: "catalog",
    lastPrice: asset.lastPrice ?? null,
    changePercent: asset.changePercent ?? null,
    dayVolume: asset.dayVolume ?? null,
    peRatio: asset.peRatio ?? null,
    pbRatio: asset.pbRatio ?? null,
    dividendYield: asset.dividendYield ?? null,
    roe: asset.roe ?? null,
    netMargin: asset.netMargin ?? null,
    isActive: 1,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  })
);

export function normalizeAssetType(type?: string): string | undefined {
  if (!type || type === "Todos" || type === "ALL" || type === "all") return undefined;
  const upper = type.toUpperCase().trim();
  switch (upper) {
    case "AÇÃO":
    case "ACOES":
    case "AÇÕES":
    case "ACAO":
    case "STOCK":
    case "STOCKS":
      return "STOCK";
    case "FII":
    case "FIIS":
    case "REIT":
    case "REITS":
      return "REIT";
    case "CRIPTO":
    case "CRYPTO":
      return "CRYPTO";
    case "ÍNDICE":
    case "INDICE":
    case "INDICES":
    case "INDEX":
      return "INDEX";
    case "COMMODITY":
    case "COMMODITIES":
      return "COMMODITY";
    case "FOREX":
    case "CAMBIO":
    case "CÂMBIO":
      return "FOREX";
    case "ETF":
    case "ETFS":
      return "ETF";
    default:
      return upper;
  }
}

/** A clearly identified local fallback so the demo remains useful without a database. */
export function listDemoCatalogAssets(input?: {
  search?: string;
  assetType?: string;
}) {
  const search = input?.search?.trim().toUpperCase();
  const normalizedType = normalizeAssetType(input?.assetType);
  return demoCatalogRows.filter(
    asset =>
      (!search || asset.ticker.includes(search)) &&
      (!normalizedType || asset.assetType === normalizedType)
  );
}

function parseNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export async function ensureCatalogSeed() {
  if (skipCatalogSeedForTests) return;
  if (!seedPromise) {
    seedPromise = (async () => {
      const db = await getDb();
      if (!db) return;
      const existing = await db.select({ ticker: assets.ticker, id: assets.id }).from(assets);
      const existingTickers = new Set(existing.map(a => a.ticker));
      const missing = catalog.filter(a => !existingTickers.has(a.ticker));
      if (missing.length > 0) {
        await db.insert(assets).values(missing);
      }
      const savedAssets = await db.select().from(assets);
      const now = Date.now();
      const quoteRows = savedAssets.flatMap(asset => {
        const anchor = parseNumber(asset.lastPrice, 100);
        return Array.from({ length: 42 }, (_, index) => {
          const step = 41 - index;
          const drift =
            Math.sin(step * 0.74 + asset.id) * anchor * 0.012 +
            (step % 7) * anchor * 0.0015;
          const close = Math.max(
            anchor * 0.72,
            anchor +
              drift -
              anchor * (parseNumber(asset.changePercent) / 100) * 0.3
          );
          const open = close * (1 - Math.sin(step + asset.id) * 0.004);
          const high = Math.max(open, close) * 1.008;
          const low = Math.min(open, close) * 0.992;
          return {
            assetId: asset.id,
            interval: "1D",
            quoteTime: new Date(now - step * 24 * 60 * 60 * 1000),
            open: open.toFixed(6),
            high: high.toFixed(6),
            low: low.toFixed(6),
            close: close.toFixed(6),
            volume: String(
              Math.round(
                parseNumber(asset.dayVolume, 100000) *
                  (0.86 + ((step + asset.id) % 5) * 0.06)
              )
            ),
            source: "catalog",
          };
        });
      });
      if (quoteRows.length) await db.insert(quotes).values(quoteRows);
      const nowDate = new Date();
      const savedByTicker = new Map(
        savedAssets.map(asset => [asset.ticker, asset.id])
      );
      const dividendRows = [
        ["PETR4", 0.52],
        ["VALE3", 1.12],
        ["ITUB4", 0.28],
        ["HGLG11", 1.1],
        ["IVVB11", 0.44],
      ].flatMap(([ticker, amount], index) => {
        const assetId = savedByTicker.get(String(ticker));
        return assetId
          ? [
              {
                assetId,
                eventDate: new Date(nowDate.getTime() - index * 38 * 86400000),
                amountPerShare: Number(amount).toFixed(6),
                kind: "DIVIDEND",
                sourceName: "catalog",
              },
            ]
          : [];
      });
      if (dividendRows.length) await db.insert(dividends).values(dividendRows);
      await db.insert(economicEvents).values([
        {
          title: "IPCA-15",
          category: "Inflação",
          country: "BR",
          importance: "HIGH" as const,
          eventDate: new Date(now + 2 * 86400000),
          forecast: "0,34%",
          previous: "0,21%",
          sourceName: "catalog",
        },
        {
          title: "Decisão de juros — Copom",
          category: "Juros",
          country: "BR",
          importance: "HIGH" as const,
          eventDate: new Date(now + 6 * 86400000),
          forecast: "10,50%",
          previous: "10,50%",
          sourceName: "catalog",
        },
        {
          title: "Payroll",
          category: "Trabalho",
          country: "US",
          importance: "HIGH" as const,
          eventDate: new Date(now + 9 * 86400000),
          forecast: "185k",
          previous: "206k",
          sourceName: "catalog",
        },
      ]);
      const pet = savedByTicker.get("PETR4");
      const vale = savedByTicker.get("VALE3");
      await db.insert(news).values([
        {
          assetId: pet,
          title: "Setor de energia acompanha curva internacional do petróleo",
          summary:
            "Leitura informativa de mercado para acompanhar o impacto de commodities sobre o segmento.",
          sourceName: "catalog",
          url: "https://www.b3.com.br/",
          category: "Mercados",
          publishedAt: new Date(now - 45 * 60000),
        },
        {
          assetId: vale,
          title: "Minério de ferro e dados chineses entram no radar do mercado",
          summary:
            "Resumo de contexto para monitoramento de empresas ligadas à mineração.",
          sourceName: "catalog",
          url: "https://www.bcb.gov.br/",
          category: "Commodities",
          publishedAt: new Date(now - 2 * 3600000),
        },
        {
          title: "Bolsas globais operam com atenção a dados macroeconômicos",
          summary:
            "Agenda internacional concentra divulgações relevantes ao longo da semana.",
          sourceName: "catalog",
          url: "https://www.cvm.gov.br/",
          category: "Internacional",
          publishedAt: new Date(now - 5 * 3600000),
        },
      ]);
    })().catch(error => {
      seedPromise = null;
      console.warn("[Database] Catalog seed skipped:", error);
    });
  }
  await seedPromise;
}

export async function listAssets(input?: {
  search?: string;
  assetType?: string;
}) {
  await ensureCatalogSeed();
  const db = await getDb();
  const normalizedType = normalizeAssetType(input?.assetType);
  if (!db) return listDemoCatalogAssets({ search: input?.search, assetType: normalizedType });
  const filters = [eq(assets.isActive, 1)];
  if (input?.search)
    filters.push(like(assets.ticker, `%${input.search.toUpperCase()}%`));
  if (normalizedType)
    filters.push(eq(assets.assetType, normalizedType));
  return db
    .select()
    .from(assets)
    .where(and(...filters))
    .orderBy(asc(assets.ticker));
}

export async function getAssetByTicker(ticker: string) {
  await ensureCatalogSeed();
  const db = await getDb();
  if (!db)
    return listDemoCatalogAssets({ search: ticker }).find(
      asset => asset.ticker === ticker.toUpperCase()
    );
  const rows = await db
    .select()
    .from(assets)
    .where(eq(assets.ticker, ticker.toUpperCase()))
    .limit(1);
  return rows[0];
}

export async function getAssetById(id: number) {
  await ensureCatalogSeed();
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
  return rows[0];
}

export async function getQuotes(assetId: number, interval = "1D", limit = 120) {
  await ensureCatalogSeed();
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.assetId, assetId), eq(quotes.interval, interval)))
    .orderBy(desc(quotes.quoteTime))
    .limit(limit);
  return rows.reverse();
}

export async function updateAssetQuote(
  assetId: number,
  quote: {
    price: number;
    changePercent: number;
    volume: number;
    open: number;
    high: number;
    low: number;
    source: string;
  }
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(assets)
    .set({
      lastPrice: quote.price.toFixed(6),
      changePercent: quote.changePercent.toFixed(4),
      dayVolume: quote.volume.toFixed(4),
      source: quote.source,
      updatedAt: new Date(),
    })
    .where(eq(assets.id, assetId));
  await db
    .insert(quotes)
    .values({
      assetId,
      interval: "1D",
      quoteTime: new Date(),
      open: quote.open.toFixed(6),
      high: quote.high.toFixed(6),
      low: quote.low.toFixed(6),
      close: quote.price.toFixed(6),
      volume: quote.volume.toFixed(4),
      source: quote.source,
    })
    .onDuplicateKeyUpdate({
      set: { close: quote.price.toFixed(6), source: quote.source },
    });
  await evaluatePriceAlerts(assetId, quote.price);
}

export async function evaluatePriceAlerts(
  assetId: number,
  currentPrice: number
) {
  const db = await getDb();
  if (!db) return 0;
  const candidates = await db
    .select({ alert: priceAlerts, asset: assets, user: users })
    .from(priceAlerts)
    .innerJoin(assets, eq(priceAlerts.assetId, assets.id))
    .innerJoin(users, eq(priceAlerts.userId, users.id))
    .where(and(eq(priceAlerts.assetId, assetId), eq(priceAlerts.isActive, 1)));
  const triggered = candidates.filter(({ alert }) =>
    alert.condition === "ABOVE"
      ? currentPrice >= parseNumber(alert.targetPrice)
      : currentPrice <= parseNumber(alert.targetPrice)
  );
  for (const { alert, asset, user } of triggered) {
    await db
      .update(priceAlerts)
      .set({ isActive: 0, triggeredAt: new Date() })
      .where(and(eq(priceAlerts.id, alert.id), eq(priceAlerts.isActive, 1)));
    const message = `${asset.ticker} atingiu ${currentPrice.toFixed(2)} e cruzou o alvo de ${Number(alert.targetPrice).toFixed(2)}.`;
    await db.insert(notifications).values({
      userId: alert.userId,
      alertId: alert.id,
      title: `Alerta acionado · ${asset.ticker}`,
      message,
    });
    const preferences = await getPreferences(user.id);
    if (user.email && preferences?.emailAlerts !== 0) {
      void sendPriceAlertEmail({
        to: user.email,
        ticker: asset.ticker,
        currentPrice,
        targetPrice: Number(alert.targetPrice),
        condition: alert.condition,
      }).catch(error => console.warn("[Alerts] Email delivery failed:", error));
    }
  }
  return triggered.length;
}

export async function listNews(input?: {
  assetId?: number;
  category?: string;
}) {
  await ensureCatalogSeed();
  const db = await getDb();
  if (!db) return [];
  const filters = [];
  if (input?.assetId) filters.push(eq(news.assetId, input.assetId));
  if (input?.category && input.category !== "Todas")
    filters.push(eq(news.category, input.category));
  return db
    .select()
    .from(news)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(news.publishedAt))
    .limit(20);
}

export async function listEconomicEvents() {
  await ensureCatalogSeed();
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(economicEvents)
    .orderBy(asc(economicEvents.eventDate))
    .limit(30);
}

export async function listDividends(assetId: number) {
  await ensureCatalogSeed();
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(dividends)
    .where(eq(dividends.assetId, assetId))
    .orderBy(desc(dividends.eventDate))
    .limit(24);
}

export async function getWatchlist(userId: number) {
  await ensureCatalogSeed();
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      watchlistId: watchlists.id,
      asset: assets,
      createdAt: watchlists.createdAt,
    })
    .from(watchlists)
    .innerJoin(assets, eq(watchlists.assetId, assets.id))
    .where(eq(watchlists.userId, userId))
    .orderBy(desc(watchlists.createdAt));
}

export async function addWatchlist(userId: number, assetId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(watchlists)
    .values({ userId, assetId })
    .onDuplicateKeyUpdate({ set: { assetId } });
}

export async function removeWatchlist(userId: number, assetId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(watchlists)
    .where(and(eq(watchlists.userId, userId), eq(watchlists.assetId, assetId)));
}

export async function listTransactions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ transaction: transactions, asset: assets })
    .from(transactions)
    .innerJoin(assets, eq(transactions.assetId, assets.id))
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.transactionDate));
}

export async function createTransaction(
  userId: number,
  input: Omit<InsertTransaction, "userId">
) {
  const db = await getDb();
  if (!db)
    throw new Error(
      "A persistência da carteira não está disponível no momento."
    );
  await db.insert(transactions).values({ ...input, userId });
}

export async function createTransactions(
  userId: number,
  inputs: Array<Omit<InsertTransaction, "userId">>
) {
  if (!inputs.length) return;
  const db = await getDb();
  if (!db)
    throw new Error(
      "A persistência da carteira não está disponível no momento."
    );
  await db
    .insert(transactions)
    .values(inputs.map(input => ({ ...input, userId })));
}

export async function deleteTransaction(userId: number, id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.id, id)));
}

export async function listAlerts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ alert: priceAlerts, asset: assets })
    .from(priceAlerts)
    .innerJoin(assets, eq(priceAlerts.assetId, assets.id))
    .where(eq(priceAlerts.userId, userId))
    .orderBy(desc(priceAlerts.createdAt));
}

/** Assets that have at least one active alert. Used by the server-side monitor. */
export async function listAlertAssets() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: assets.id,
      ticker: assets.ticker,
      assetType: assets.assetType,
    })
    .from(priceAlerts)
    .innerJoin(assets, eq(priceAlerts.assetId, assets.id))
    .where(eq(priceAlerts.isActive, 1));
  return Array.from(new Map(rows.map(row => [row.id, row])).values());
}

export async function createAlert(
  userId: number,
  input: Omit<InsertPriceAlert, "userId">
) {
  const db = await getDb();
  if (!db)
    throw new Error(
      "A persistência dos alertas não está disponível no momento."
    );
  await db.insert(priceAlerts).values({ ...input, userId });
}

export async function toggleAlert(
  userId: number,
  id: number,
  isActive: boolean
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(priceAlerts)
    .set({ isActive: isActive ? 1 : 0 })
    .where(and(eq(priceAlerts.userId, userId), eq(priceAlerts.id, id)));
}

export async function deleteAlert(userId: number, id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(priceAlerts)
    .where(and(eq(priceAlerts.userId, userId), eq(priceAlerts.id, id)));
}

export async function listNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(20);
}

export async function markNotificationRead(userId: number, id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ isRead: 1 })
    .where(and(eq(notifications.userId, userId), eq(notifications.id, id)));
}

export async function getPortfolioSummary(userId: number) {
  const rows = await listTransactions(userId);
  return summarizePortfolioRows(rows);
}

export async function getPortfolioPerformance(userId: number) {
  const rows = await listTransactions(userId);
  return summarizePortfolioPerformance(rows);
}

export async function getPortfolioDividendIncome(userId: number) {
  const rows = await listTransactions(userId);
  const assetIds = Array.from(new Set(rows.map(row => row.asset.id)));
  if (!assetIds.length) return [];
  const db = await getDb();
  if (!db) return [];
  const events = await db
    .select({ asset: assets, dividend: dividends })
    .from(dividends)
    .innerJoin(assets, eq(dividends.assetId, assets.id))
    .where(inArray(dividends.assetId, assetIds))
    .orderBy(desc(dividends.eventDate));
  return estimateDividendIncome(rows, events);
}

export async function getPreferences(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  return rows[0];
}

export async function savePreferences(
  userId: number,
  input: {
    theme?: "light" | "dark" | "system";
    dashboardLayout?: string;
    emailAlerts?: boolean;
  }
) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(userPreferences)
    .values({
      userId,
      theme: input.theme ?? "system",
      dashboardLayout: input.dashboardLayout,
      emailAlerts: input.emailAlerts === false ? 0 : 1,
    })
    .onDuplicateKeyUpdate({
      set: {
        ...(input.theme ? { theme: input.theme } : {}),
        ...(input.dashboardLayout !== undefined
          ? { dashboardLayout: input.dashboardLayout }
          : {}),
        ...(input.emailAlerts !== undefined
          ? { emailAlerts: input.emailAlerts ? 1 : 0 }
          : {}),
        updatedAt: new Date(),
      },
    });
}

export async function getLatestAssetsByIds(ids: number[]) {
  const db = await getDb();
  if (!db || ids.length === 0) return [];
  return db.select().from(assets).where(inArray(assets.id, ids));
}
