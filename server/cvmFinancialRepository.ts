import { and, desc, eq, sql } from "drizzle-orm";
import {
  assets,
  cvmFinancialSnapshots,
  cvmQuarterlyFinancials,
} from "../drizzle/schema";
import { getDb } from "./db";
import {
  financialQuarterLabel,
  type CvmFinancialStatements,
} from "./cvmFinancialData";

const decimal = (value: number | null) =>
  value === null || !Number.isFinite(value) ? null : value.toFixed(2);
const numeric = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function listCvmIngestionTargets(limit = 25) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL indisponível para ingestão CVM.");
  return db
    .select({ id: assets.id, ticker: assets.ticker, assetType: assets.assetType })
    .from(assets)
    .where(
      and(
        eq(assets.isActive, 1),
        eq(assets.assetType, "STOCK"),
        eq(assets.exchange, "B3")
      )
    )
    .limit(Math.max(1, Math.min(limit, 100)));
}

export async function saveCvmFinancialStatements(
  assetId: number,
  statement: CvmFinancialStatements
) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL indisponível para persistência CVM.");
  const sourceAsOf = new Date(statement.asOf);
  const safeAsOf = Number.isNaN(sourceAsOf.valueOf()) ? new Date() : sourceAsOf;
  await db.transaction(async tx => {
    const snapshot = {
      assetId,
      cnpj: statement.cnpj,
      cvmCode: statement.cvmCode,
      companyName: statement.companyName,
      filing: statement.filing,
      referenceDate: statement.referenceDate,
      periodStart: statement.periodStart,
      periodEnd: statement.periodEnd,
      version: statement.version,
      revenue: decimal(statement.values.revenue),
      netIncome: decimal(statement.values.netIncome),
      totalAssets: decimal(statement.values.totalAssets),
      equity: decimal(statement.values.equity),
      comparativeRevenue: decimal(statement.comparatives.revenue),
      comparativeNetIncome: decimal(statement.comparatives.netIncome),
      comparativeTotalAssets: decimal(statement.comparatives.totalAssets),
      comparativeEquity: decimal(statement.comparatives.equity),
      sourceUrl: statement.sourceUrl,
      sourceAsOf: safeAsOf,
    };
    await tx
      .insert(cvmFinancialSnapshots)
      .values(snapshot)
      .onDuplicateKeyUpdate({ set: { ...snapshot, updatedAt: new Date() } });
    if (statement.quarterlyHistory.length)
      await tx
        .insert(cvmQuarterlyFinancials)
        .values(
          statement.quarterlyHistory.map(point => ({
            assetId,
            periodStart: point.periodStart,
            periodEnd: point.periodEnd,
            revenue: decimal(point.revenue)!,
            netIncome: decimal(point.netIncome),
            netMargin:
              point.netMargin === null ? null : point.netMargin.toFixed(6),
            sourceAsOf: safeAsOf,
          }))
        )
        .onDuplicateKeyUpdate({
          set: {
            revenue: sql`values(${cvmQuarterlyFinancials.revenue})`,
            netIncome: sql`values(${cvmQuarterlyFinancials.netIncome})`,
            netMargin: sql`values(${cvmQuarterlyFinancials.netMargin})`,
            periodStart: sql`values(${cvmQuarterlyFinancials.periodStart})`,
            sourceAsOf: sql`values(${cvmQuarterlyFinancials.sourceAsOf})`,
            updatedAt: new Date(),
          },
        });
  });
}

export async function getStoredCvmFinancialStatements(
  assetId: number,
  ticker: string
) {
  const db = await getDb();
  if (!db) return null;
  const [snapshot] = await db
    .select()
    .from(cvmFinancialSnapshots)
    .where(eq(cvmFinancialSnapshots.assetId, assetId))
    .orderBy(desc(cvmFinancialSnapshots.referenceDate), desc(cvmFinancialSnapshots.version))
    .limit(1);
  if (!snapshot) return null;
  const historyRows = await db
    .select()
    .from(cvmQuarterlyFinancials)
    .where(eq(cvmQuarterlyFinancials.assetId, assetId))
    .orderBy(desc(cvmQuarterlyFinancials.periodEnd))
    .limit(8);
  return {
    ticker: ticker.toUpperCase(),
    cnpj: snapshot.cnpj,
    cvmCode: snapshot.cvmCode,
    companyName: snapshot.companyName,
    filing: snapshot.filing,
    referenceDate: snapshot.referenceDate,
    periodStart: snapshot.periodStart,
    periodEnd: snapshot.periodEnd,
    version: snapshot.version,
    currency: "BRL" as const,
    values: {
      revenue: numeric(snapshot.revenue),
      netIncome: numeric(snapshot.netIncome),
      totalAssets: numeric(snapshot.totalAssets),
      equity: numeric(snapshot.equity),
    },
    comparatives: {
      revenue: numeric(snapshot.comparativeRevenue),
      netIncome: numeric(snapshot.comparativeNetIncome),
      totalAssets: numeric(snapshot.comparativeTotalAssets),
      equity: numeric(snapshot.comparativeEquity),
    },
    quarterlyHistory: historyRows.reverse().map(row => ({
      label: financialQuarterLabel(row.periodEnd),
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      revenue: Number(row.revenue),
      netIncome: numeric(row.netIncome),
      netMargin: numeric(row.netMargin),
      source: "cvm" as const,
    })),
    source: "cvm" as const,
    sourceUrl: snapshot.sourceUrl,
    asOf: snapshot.sourceAsOf.toISOString(),
  } satisfies CvmFinancialStatements;
}
