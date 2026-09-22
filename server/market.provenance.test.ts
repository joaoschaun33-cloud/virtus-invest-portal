import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getAssetByTicker: vi.fn(),
  getQuotes: vi.fn(),
  listAssets: vi.fn(),
  listNews: vi.fn(),
  listEconomicEvents: vi.fn(),
  listDividends: vi.fn(),
  syncBinanceCryptoQuotes: vi.fn().mockResolvedValue(0),
  updateAssetQuote: vi.fn(),
}));

const providerMocks = vi.hoisted(() => ({
  fetchEconomicCalendar: vi.fn(),
  fetchFundamentals: vi.fn(),
  fetchHistoricalCandles: vi.fn(),
  fetchLiveQuote: vi.fn(),
  fetchProviderNews: vi.fn(),
  getProviderStatus: vi.fn(),
}));

const officialNewsMocks = vi.hoisted(() => ({
  fetchOfficialNews: vi.fn(),
}));

vi.mock("./db", () => dbMocks);
vi.mock("./marketProviders", () => providerMocks);
vi.mock("./officialNews", () => officialNewsMocks);

import { marketRouter } from "./routers/market";

const asset = {
  id: 7,
  ticker: "PETR4",
  name: "Petróleo Brasileiro PN",
  assetType: "STOCK",
  exchange: "B3",
  currency: "BRL",
  sector: "Energia",
  lastPrice: "38.50",
  changePercent: "1.20",
  dayVolume: "1000",
  source: "catalog",
  peRatio: "6.10",
  pbRatio: "1.20",
  dividendYield: "8.00",
  roe: "20.00",
  netMargin: "15.00",
};

const context = { user: null, req: {}, res: {} } as never;

describe("market provenance contract", () => {
  beforeEach(() => {
    officialNewsMocks.fetchOfficialNews.mockResolvedValue([]);
  });
  it("returns catalog origin and demo flag when live providers have no response", async () => {
    dbMocks.getAssetByTicker.mockResolvedValue(asset);
    dbMocks.getQuotes.mockResolvedValue([
      {
        quoteTime: new Date("2026-08-15T12:00:00Z"),
        open: "38",
        high: "39",
        low: "37",
        close: "38.5",
        volume: "1000",
      },
    ]);
    providerMocks.fetchHistoricalCandles.mockResolvedValue([]);
    providerMocks.fetchLiveQuote.mockResolvedValue(null);
    providerMocks.fetchFundamentals.mockResolvedValue(null);
    providerMocks.getProviderStatus.mockReturnValue({
      brapi: false,
      twelveData: false,
      finnhub: false,
      resend: false,
    });

    const result = await marketRouter
      .createCaller(context)
      .asset({ ticker: "PETR4", interval: "1D" });

    expect(result).toMatchObject({
      dataSource: "catalog",
      fundamentalsSource: "catalog",
      isDemo: true,
    });
    expect(result?.quote).toMatchObject({
      ticker: "PETR4",
      price: 38.5,
      source: "catalog",
      freshness: "demo",
      isDemo: true,
    });
    expect(result?.quotes[0]).toMatchObject({ close: 38.5, source: "catalog" });
  });

  it("preserves live source and clears demo flag when history and fundamentals are available", async () => {
    dbMocks.getAssetByTicker.mockResolvedValue(asset);
    dbMocks.getQuotes.mockResolvedValue([]);
    providerMocks.fetchHistoricalCandles.mockResolvedValue([
      {
        time: new Date("2026-08-15T12:00:00Z"),
        open: 38,
        high: 39,
        low: 37,
        close: 38.5,
        volume: 1000,
        source: "twelve-data",
      },
    ]);
    providerMocks.fetchLiveQuote.mockResolvedValue({
      ticker: "PETR4",
      price: 40,
      changePercent: 2,
      volume: 2000,
      open: 39,
      high: 41,
      low: 38,
      source: "twelve-data",
      asOf: "2026-08-16T12:00:00.000Z",
    });
    providerMocks.fetchFundamentals.mockResolvedValue({
      ticker: "PETR4",
      peRatio: 5.5,
      pbRatio: 1.1,
      dividendYield: 9,
      roe: 22,
      netMargin: 17,
      source: "twelve-data",
      asOf: new Date().toISOString(),
    });
    providerMocks.getProviderStatus.mockReturnValue({
      brapi: false,
      twelveData: true,
      finnhub: false,
      resend: false,
    });

    const result = await marketRouter
      .createCaller(context)
      .asset({ ticker: "PETR4", interval: "1M" });

    expect(result).toMatchObject({
      dataSource: "twelve-data",
      fundamentalsSource: "twelve-data",
      isDemo: false,
    });
    expect(result?.asset.peRatio).toBe("5.500000");
    expect(result?.quote).toMatchObject({
      price: 40,
      source: "twelve-data",
      freshness: "delayed",
      isDemo: false,
    });
    expect(result?.quotes[0]).toMatchObject({
      close: 38.5,
      source: "twelve-data",
    });
  });

  it("preserves stored provider provenance when live history is unavailable", async () => {
    dbMocks.getAssetByTicker.mockResolvedValue(asset);
    dbMocks.getQuotes.mockResolvedValue([
      {
        quoteTime: new Date("2026-08-15T12:00:00Z"),
        open: "38",
        high: "39",
        low: "37",
        close: "38.5",
        volume: "1000",
        source: "brapi",
      },
    ]);
    providerMocks.fetchHistoricalCandles.mockResolvedValue([]);
    providerMocks.fetchLiveQuote.mockResolvedValue(null);
    providerMocks.fetchFundamentals.mockResolvedValue(null);
    providerMocks.getProviderStatus.mockReturnValue({
      brapi: true,
      twelveData: false,
      finnhub: false,
      resend: false,
    });

    const result = await marketRouter
      .createCaller(context)
      .asset({ ticker: "PETR4", interval: "1D" });

    expect(result).toMatchObject({
      dataSource: "brapi",
      isDemo: false,
    });
    expect(result?.quotes[0]).toMatchObject({
      close: 38.5,
      source: "brapi",
    });
  });

  it("applies category filter to official news in the backend", async () => {
    officialNewsMocks.fetchOfficialNews.mockResolvedValue([
      {
        headline: "Decisão macroeconômica",
        summary: "Resumo macro",
        sourceName: "Agência Brasil",
        url: "https://agenciabrasil.ebc.com.br/macro",
        publishedAt: new Date("2026-08-20T12:00:00Z"),
        category: "Mercado",
        source: "agencia-brasil",
      },
      {
        headline: "Comunicado regulatório",
        summary: "Resumo regulatório",
        sourceName: "CVM",
        url: "https://www.gov.br/cvm/regulacao",
        publishedAt: new Date("2026-08-20T13:00:00Z"),
        category: "Regulação",
        source: "cvm",
      },
    ]);

    const result = await marketRouter
      .createCaller(context)
      .news({ category: "Regulação" });

    expect(result).toHaveLength(1);
    expect(result[0]?.category).toBe("Regulação");
  });

  it("returns explicit demo provenance for editorial fallback without external calls", async () => {
    dbMocks.listNews.mockResolvedValue([
      {
        id: 1,
        assetId: 7,
        title: "Catálogo",
        summary: "Demonstração",
        sourceName: "catalog",
        url: "https://example.com",
        category: "Mercado",
        publishedAt: new Date(),
        createdAt: new Date(),
      },
    ]);
    dbMocks.listEconomicEvents.mockResolvedValue([
      {
        id: 1,
        title: "Evento catálogo",
        category: "Macro",
        country: "BR",
        importance: "MEDIUM",
        eventDate: new Date(),
        forecast: null,
        previous: null,
        createdAt: new Date(),
      },
    ]);
    providerMocks.fetchProviderNews.mockResolvedValue([]);
    providerMocks.fetchEconomicCalendar.mockResolvedValue([]);

    const caller = marketRouter.createCaller(context);
    const status = await caller.editorialStatus();
    const news = await caller.news({});
    const calendar = await caller.calendar();

    expect(status).toMatchObject({
      newsIsDemo: true,
      newsSource: "catalog",
      calendarIsDemo: true,
      calendarSource: "catalog",
    });
    expect(news).toEqual([]);
    expect(calendar[0]?.title).toBe("Evento catálogo");
  });
});
