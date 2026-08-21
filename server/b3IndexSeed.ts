import { eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { assets } from "../drizzle/schema";
import { getAllB3IndexConstituents, IndexConstituent } from "./b3IndexComposition";

export type SeedResult = {
  totalConstituents: number;
  inserted: number;
  updated: number;
  totalInDatabase: number;
};

export async function runB3IndexSeed(): Promise<SeedResult> {
  const constituents = getAllB3IndexConstituents();
  const db = await getDb();

  if (!db) {
    return {
      totalConstituents: constituents.length,
      inserted: 0,
      updated: 0,
      totalInDatabase: 0,
    };
  }

  const existingAssets = await db.select({ ticker: assets.ticker, id: assets.id }).from(assets);
  const existingSet = new Set(existingAssets.map(a => a.ticker));

  let inserted = 0;
  let updated = 0;

  for (const c of constituents) {
    if (!existingSet.has(c.ticker)) {
      await db.insert(assets).values({
        ticker: c.ticker,
        name: c.name,
        assetType: c.assetType,
        exchange: c.exchange,
        currency: c.currency,
        sector: c.sector ?? null,
        source: "b3",
        lastPrice: "0",
        changePercent: "0",
        dayVolume: "0",
        isActive: 1,
      });
      inserted += 1;
    } else {
      await db
        .update(assets)
        .set({
          name: c.name,
          assetType: c.assetType,
          sector: c.sector ?? null,
          isActive: 1,
        })
        .where(eq(assets.ticker, c.ticker));
      updated += 1;
    }
  }

  const countResult = await db.select({ count: sql<number>`count(*)` }).from(assets);
  const totalInDatabase = Number(countResult[0]?.count ?? 0);

  return {
    totalConstituents: constituents.length,
    inserted,
    updated,
    totalInDatabase,
  };
}
