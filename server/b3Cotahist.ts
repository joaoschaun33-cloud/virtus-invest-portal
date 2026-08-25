import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { unzipSync } from "fflate";
import { assets, quotes } from "../drizzle/schema";
import { getDb } from "./db";

const DEFAULT_BASE_URL = "https://bvmf.bmfbovespa.com.br/InstDados/SerHist";
const MAX_ZIP_BYTES = 8_000_000;
const MAX_TEXT_BYTES = 80_000_000;
const MARKET_TYPE_SPOT = "010";
const ACCEPTED_BDI_CODES = new Set(["02", "12", "14"]);

export type B3CotahistRow = {
  ticker: string;
  name: string;
  tradingDate: string;
  currency: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: "b3";
};

export type B3CotahistIngestionResult = {
  tradingDate: string;
  sourceUrl: string;
  parsed: number;
  matched: number;
  saved: number;
  skipped: number;
};

function field(line: string, start: number, length: number) {
  return line.slice(start - 1, start - 1 + length);
}

function impliedDecimal(value: string, scale = 2) {
  const digits = value.trim();
  if (!/^\d+$/.test(digits)) return null;
  const numeric = Number(digits) / 10 ** scale;
  return Number.isFinite(numeric) ? numeric : null;
}

function isoDate(raw: string) {
  if (!/^\d{8}$/.test(raw)) return null;
  const value = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(parsed.valueOf()) ? null : value;
}

function isoCurrency(raw: string) {
  const value = raw.trim().toUpperCase();
  if (value === "R$" || value === "REAL") return "BRL";
  return /^[A-Z]{3}$/.test(value) ? value : "BRL";
}

/** Parse one official fixed-width COTAHIST type-01 record. */
export function parseB3CotahistLine(line: string): B3CotahistRow | null {
  if (line.length < 188 || field(line, 1, 2) !== "01") return null;
  if (field(line, 25, 3) !== MARKET_TYPE_SPOT) return null;
  if (!ACCEPTED_BDI_CODES.has(field(line, 11, 2))) return null;
  const tradingDate = isoDate(field(line, 3, 8));
  const ticker = field(line, 13, 12).trim().toUpperCase();
  const open = impliedDecimal(field(line, 57, 13));
  const high = impliedDecimal(field(line, 70, 13));
  const low = impliedDecimal(field(line, 83, 13));
  const close = impliedDecimal(field(line, 109, 13));
  // QUATOT is the number of securities/contracts traded. The following field
  // (VOLTOT) is financial turnover and must not be exposed as share volume.
  const volume = impliedDecimal(field(line, 153, 18), 0);
  if (
    !tradingDate ||
    !/^[A-Z0-9]{4,12}$/.test(ticker) ||
    open === null ||
    high === null ||
    low === null ||
    close === null ||
    volume === null ||
    close <= 0
  )
    return null;
  return {
    ticker,
    name: field(line, 28, 12).trim(),
    tradingDate,
    currency: isoCurrency(field(line, 53, 4)),
    open,
    high,
    low,
    close,
    volume,
    source: "b3",
  };
}

export function parseB3CotahistText(text: string) {
  const byTicker = new Map<string, B3CotahistRow>();
  for (const line of text.split(/\r?\n/)) {
    const row = parseB3CotahistLine(line);
    if (row) byTicker.set(row.ticker, row);
  }
  return Array.from(byTicker.values());
}

function dailyFileName(date: Date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `COTAHIST_D${day}${month}${date.getUTCFullYear()}.ZIP`;
}

function decodeZip(bytes: Uint8Array) {
  const entries = unzipSync(bytes);
  const entry = Object.entries(entries).find(([name]) =>
    /COTAHIST_D\d{8}\.TXT$/i.test(name)
  )?.[1];
  if (!entry || entry.byteLength > MAX_TEXT_BYTES)
    throw new Error("COTAHIST TXT ausente ou acima do limite configurado");
  return new TextDecoder("windows-1252").decode(entry);
}

async function downloadLatestDailyFile(referenceDate: Date) {
  const baseUrl = process.env.B3_COTAHIST_BASE_URL ?? DEFAULT_BASE_URL;
  for (let offset = 0; offset < 8; offset += 1) {
    const candidate = new Date(referenceDate);
    candidate.setUTCDate(candidate.getUTCDate() - offset);
    const day = candidate.getUTCDay();
    if (day === 0 || day === 6) continue;
    const fileName = dailyFileName(candidate);
    const sourceUrl = `${baseUrl}/${fileName}`;
    const response = await fetch(sourceUrl, {
      signal: AbortSignal.timeout(30_000),
      headers: { "User-Agent": "VirtusMarketData/1.0" },
    });
    if (response.status === 404) continue;
    if (!response.ok)
      throw new Error(`B3 COTAHIST respondeu HTTP ${response.status}`);
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > MAX_ZIP_BYTES)
      throw new Error("COTAHIST ZIP acima do limite configurado");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_ZIP_BYTES)
      throw new Error("COTAHIST ZIP acima do limite configurado");
    return { sourceUrl, text: decodeZip(bytes) };
  }
  throw new Error(
    "Nenhum arquivo COTAHIST diário disponível nos últimos 8 dias"
  );
}

function quoteDate(date: string) {
  return new Date(`${date}T12:00:00.000Z`);
}

export async function runB3CotahistIngestion(input?: {
  referenceDate?: Date;
  text?: string;
  sourceUrl?: string;
}): Promise<B3CotahistIngestionResult> {
  const downloaded = input?.text
    ? { text: input.text, sourceUrl: input.sourceUrl ?? "fixture://cotahist" }
    : await downloadLatestDailyFile(input?.referenceDate ?? new Date());
  const rows = parseB3CotahistText(downloaded.text);
  const tradingDate = rows[0]?.tradingDate;
  if (!tradingDate) throw new Error("COTAHIST não contém registros válidos");
  if (rows.some(row => row.tradingDate !== tradingDate))
    throw new Error("COTAHIST diário contém mais de uma data de pregão");
  const db = await getDb();
  if (!db)
    return {
      tradingDate,
      sourceUrl: downloaded.sourceUrl,
      parsed: rows.length,
      matched: 0,
      saved: 0,
      skipped: rows.length,
    };

  const existing = await db
    .select({
      id: assets.id,
      ticker: assets.ticker,
      lastPrice: assets.lastPrice,
      source: assets.source,
    })
    .from(assets)
    .where(
      inArray(
        assets.ticker,
        rows.map(row => row.ticker)
      )
    );
  const assetByTicker = new Map(existing.map(asset => [asset.ticker, asset]));
  const matched = rows.filter(row => assetByTicker.has(row.ticker));
  const assetIds = matched.map(row => assetByTicker.get(row.ticker)!.id);
  const previousRows = assetIds.length
    ? await db
        .select({
          assetId: quotes.assetId,
          close: quotes.close,
          quoteTime: quotes.quoteTime,
        })
        .from(quotes)
        .where(
          and(
            inArray(quotes.assetId, assetIds),
            eq(quotes.interval, "1D"),
            lt(quotes.quoteTime, quoteDate(tradingDate))
          )
        )
        .orderBy(desc(quotes.quoteTime))
    : [];
  const previousByAsset = new Map<number, number>();
  for (const previous of previousRows)
    if (!previousByAsset.has(previous.assetId))
      previousByAsset.set(previous.assetId, Number(previous.close));

  for (const row of matched) {
    const asset = assetByTicker.get(row.ticker)!;
    const previous = previousByAsset.get(asset.id);
    const changePercent =
      previous && Number.isFinite(previous) && previous > 0
        ? ((row.close - previous) / previous) * 100
        : null;
    await db
      .insert(quotes)
      .values({
        assetId: asset.id,
        interval: "1D",
        quoteTime: quoteDate(tradingDate),
        open: row.open.toFixed(6),
        high: row.high.toFixed(6),
        low: row.low.toFixed(6),
        close: row.close.toFixed(6),
        volume: row.volume.toFixed(4),
        source: "b3",
      })
      .onDuplicateKeyUpdate({
        set: {
          open: row.open.toFixed(6),
          high: row.high.toFixed(6),
          low: row.low.toFixed(6),
          close: row.close.toFixed(6),
          volume: row.volume.toFixed(4),
          source: "b3",
        },
      });
    await db
      .update(assets)
      .set({
        source: "b3",
        currency: row.currency,
        lastPrice: row.close.toFixed(6),
        changePercent: changePercent?.toFixed(4) ?? null,
        dayVolume: row.volume.toFixed(4),
        updatedAt: quoteDate(tradingDate),
      })
      .where(eq(assets.id, asset.id));
  }

  return {
    tradingDate,
    sourceUrl: downloaded.sourceUrl,
    parsed: rows.length,
    matched: matched.length,
    saved: matched.length,
    skipped: rows.length - matched.length,
  };
}
