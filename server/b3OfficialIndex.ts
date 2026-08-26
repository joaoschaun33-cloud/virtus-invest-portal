import { eq } from "drizzle-orm";
import { assets } from "../drizzle/schema";
import { getDb } from "./db";

const BASE_URL =
  "https://sistemaswebb3-listados.b3.com.br/indexStatisticsProxy/IndexCall/GetPortfolioDay";

type DailyEvolutionRow = {
  day?: unknown;
  [key: `rateValue${number}`]: unknown;
};

export type B3IndexClose = {
  ticker: "IBOV";
  tradingDate: string;
  close: number;
  previousClose: number;
  changePercent: number;
  source: "b3";
  sourceUrl: string;
};

function parsePtBrNumber(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function validIsoDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;
  return date.toISOString().slice(0, 10);
}

/** Converts the official B3 daily-evolution matrix (days x months) into closes. */
export function parseB3IndexDailyEvolution(
  payload: unknown,
  year: number,
  sourceUrl = BASE_URL,
  referenceDate = new Date()
): B3IndexClose {
  const results = (payload as { results?: DailyEvolutionRow[] })?.results;
  if (!Array.isArray(results) || results.length < 20)
    throw new Error("B3 retornou uma série diária de índice incompleta");

  const ceiling = referenceDate.toISOString().slice(0, 10);
  const closes: Array<{ tradingDate: string; close: number }> = [];
  for (const row of results) {
    const day = Number(row.day);
    if (!Number.isInteger(day) || day < 1 || day > 31) continue;
    for (let month = 1; month <= 12; month += 1) {
      const close = parsePtBrNumber(row[`rateValue${month}`]);
      const tradingDate = validIsoDate(year, month, day);
      if (close !== null && tradingDate && tradingDate <= ceiling)
        closes.push({ tradingDate, close });
    }
  }
  closes.sort((a, b) => a.tradingDate.localeCompare(b.tradingDate));
  const latest = closes.at(-1);
  const previous = closes.at(-2);
  if (!latest || !previous)
    throw new Error("B3 não retornou dois fechamentos válidos do índice");
  return {
    ticker: "IBOV",
    tradingDate: latest.tradingDate,
    close: latest.close,
    previousClose: previous.close,
    changePercent: ((latest.close - previous.close) / previous.close) * 100,
    source: "b3",
    sourceUrl,
  };
}

export async function fetchB3IbovespaClose(referenceDate = new Date()) {
  const year = referenceDate.getUTCFullYear();
  const request = { index: "IBOVESPA", language: "pt-br", year: String(year) };
  const encoded = Buffer.from(JSON.stringify(request), "utf8").toString("base64");
  const sourceUrl = `${BASE_URL}/${encoded}`;
  const response = await fetch(sourceUrl, {
    signal: AbortSignal.timeout(20_000),
    headers: {
      Accept: "application/json",
      Referer:
        "https://sistemaswebb3-listados.b3.com.br/indexStatisticsPage/daily-evolution/IBOVESPA?language=pt-br",
      "User-Agent": "VirtusMarketData/1.0",
    },
  });
  if (!response.ok)
    throw new Error(`B3 IBOVESPA respondeu HTTP ${response.status}`);
  return parseB3IndexDailyEvolution(
    await response.json(), year, sourceUrl, referenceDate
  );
}

export async function runB3IbovespaIngestion(referenceDate = new Date()) {
  const close = await fetchB3IbovespaClose(referenceDate);
  const db = await getDb();
  if (!db) return { ...close, saved: 0 };
  await db
    .update(assets)
    .set({
      source: "b3",
      currency: "BRL",
      lastPrice: close.close.toFixed(6),
      changePercent: close.changePercent.toFixed(4),
      updatedAt: new Date(`${close.tradingDate}T12:00:00.000Z`),
    })
    .where(eq(assets.ticker, close.ticker));
  return { ...close, saved: 1 };
}
