import { and, eq, isNotNull, lte, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { assets, dividends, economicEvents, news, quotes } from "../drizzle/schema";
import { getDb } from "./db";

export type DemoDataCleanupResult = {
  catalogQuotesRemoved: number;
  catalogNewsRemoved: number;
  catalogEventsRemoved: number;
  catalogDividendsRemoved: number;
  catalogAssetsCleared: number;
  zeroAssetVolumesCleared: number;
  zeroQuoteVolumesCleared: number;
};

async function countWhere(
  tx: any,
  table: typeof assets | typeof quotes | typeof news | typeof economicEvents | typeof dividends,
  condition: SQL<unknown> | undefined
) {
  const [row] = await tx.select({ total: sql<number>`count(*)` }).from(table).where(condition);
  return Number(row?.total ?? 0);
}

/** Idempotently removes only rows explicitly marked as catalog/demo data. */
export async function cleanupProductionDemoData(): Promise<DemoDataCleanupResult> {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL não configurada");

  return db.transaction(async tx => {
    const result = {
      catalogQuotesRemoved: await countWhere(tx, quotes, eq(quotes.source, "catalog")),
      catalogNewsRemoved: await countWhere(tx, news, eq(news.sourceName, "catalog")),
      catalogEventsRemoved: await countWhere(tx, economicEvents, eq(economicEvents.sourceName, "catalog")),
      catalogDividendsRemoved: await countWhere(tx, dividends, eq(dividends.sourceName, "catalog")),
      catalogAssetsCleared: await countWhere(tx, assets, eq(assets.source, "catalog")),
      zeroAssetVolumesCleared: await countWhere(
        tx,
        assets,
        and(isNotNull(assets.dayVolume), lte(assets.dayVolume, "0"))
      ),
      zeroQuoteVolumesCleared: await countWhere(
        tx,
        quotes,
        and(isNotNull(quotes.volume), lte(quotes.volume, "0"))
      ),
    };

    await tx.delete(quotes).where(eq(quotes.source, "catalog"));
    await tx.delete(news).where(eq(news.sourceName, "catalog"));
    await tx.delete(economicEvents).where(eq(economicEvents.sourceName, "catalog"));
    await tx.delete(dividends).where(eq(dividends.sourceName, "catalog"));
    await tx
      .update(assets)
      .set({ lastPrice: null, changePercent: null, dayVolume: null, updatedAt: new Date() })
      .where(eq(assets.source, "catalog"));
    await tx
      .update(assets)
      .set({ dayVolume: null })
      .where(and(isNotNull(assets.dayVolume), lte(assets.dayVolume, "0")));
    await tx
      .update(quotes)
      .set({ volume: null })
      .where(and(isNotNull(quotes.volume), lte(quotes.volume, "0")));

    return result;
  });
}
