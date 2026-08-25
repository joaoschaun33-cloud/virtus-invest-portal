import {
  bigint,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  tinyint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core user table keyed by the Firebase Authentication uid. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const assets = mysqlTable("assets", {
  id: int("id").autoincrement().primaryKey(),
  ticker: varchar("ticker", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  assetType: varchar("assetType", { length: 32 }).notNull(),
  exchange: varchar("exchange", { length: 32 }).notNull(),
  currency: varchar("currency", { length: 8 }).notNull().default("BRL"),
  sector: varchar("sector", { length: 80 }),
  source: varchar("source", { length: 32 }).notNull().default("catalog"),
  lastPrice: decimal("lastPrice", { precision: 18, scale: 6 }),
  changePercent: decimal("changePercent", { precision: 10, scale: 4 }),
  dayVolume: decimal("dayVolume", { precision: 24, scale: 4 }),
  peRatio: decimal("peRatio", { precision: 12, scale: 4 }),
  pbRatio: decimal("pbRatio", { precision: 12, scale: 4 }),
  dividendYield: decimal("dividendYield", { precision: 12, scale: 4 }),
  roe: decimal("roe", { precision: 12, scale: 4 }),
  netMargin: decimal("netMargin", { precision: 12, scale: 4 }),
  isActive: tinyint("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;

export const quotes = mysqlTable(
  "quotes",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    assetId: int("assetId").notNull(),
    interval: varchar("interval", { length: 10 }).notNull().default("1D"),
    quoteTime: timestamp("quoteTime").notNull(),
    open: decimal("open", { precision: 18, scale: 6 }).notNull(),
    high: decimal("high", { precision: 18, scale: 6 }).notNull(),
    low: decimal("low", { precision: 18, scale: 6 }).notNull(),
    close: decimal("close", { precision: 18, scale: 6 }).notNull(),
    volume: decimal("volume", { precision: 24, scale: 4 }),
    source: varchar("source", { length: 32 }).notNull().default("catalog"),
  },
  table => ({
    assetTimeIndex: uniqueIndex("quotes_asset_interval_time_idx").on(
      table.assetId,
      table.interval,
      table.quoteTime
    ),
  })
);

export type Quote = typeof quotes.$inferSelect;

export const watchlists = mysqlTable(
  "watchlists",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    assetId: int("assetId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    userAssetIndex: uniqueIndex("watchlists_user_asset_idx").on(
      table.userId,
      table.assetId
    ),
  })
);

export type Watchlist = typeof watchlists.$inferSelect;

export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  assetId: int("assetId").notNull(),
  transactionType: mysqlEnum("transactionType", ["BUY", "SELL"]).notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 6 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 18, scale: 6 }).notNull(),
  fees: decimal("fees", { precision: 18, scale: 6 }).notNull().default("0"),
  transactionDate: timestamp("transactionDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

export const priceAlerts = mysqlTable("priceAlerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  assetId: int("assetId").notNull(),
  targetPrice: decimal("targetPrice", { precision: 18, scale: 6 }).notNull(),
  condition: mysqlEnum("condition", ["ABOVE", "BELOW"]).notNull(),
  isActive: tinyint("isActive").notNull().default(1),
  triggeredAt: timestamp("triggeredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PriceAlert = typeof priceAlerts.$inferSelect;
export type InsertPriceAlert = typeof priceAlerts.$inferInsert;

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  alertId: int("alertId"),
  title: varchar("title", { length: 160 }).notNull(),
  message: text("message").notNull(),
  isRead: tinyint("isRead").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;

export const emailDeliveries = mysqlTable(
  "emailDeliveries",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    idempotencyKey: varchar("idempotencyKey", { length: 191 }).notNull(),
    status: mysqlEnum("status", ["pending", "sent", "failed"])
      .notNull()
      .default("pending"),
    attempts: int("attempts").notNull().default(0),
    lastError: text("lastError"),
    resendId: varchar("resendId", { length: 128 }),
    sentAt: timestamp("sentAt"),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    idempotencyKeyIndex: uniqueIndex("email_deliveries_idempotency_key_idx").on(
      table.idempotencyKey
    ),
  })
);

export type EmailDelivery = typeof emailDeliveries.$inferSelect;

export const jobRuns = mysqlTable(
  "jobRuns",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    jobName: varchar("jobName", { length: 80 }).notNull(),
    runId: varchar("runId", { length: 64 }).notNull(),
    requestId: varchar("requestId", { length: 128 }),
    status: mysqlEnum("status", ["running", "succeeded", "failed", "skipped"])
      .notNull()
      .default("running"),
    startedAt: timestamp("startedAt").defaultNow().notNull(),
    finishedAt: timestamp("finishedAt"),
    durationMs: int("durationMs"),
    processed: int("processed").notNull().default(0),
    failed: int("failed").notNull().default(0),
    error: text("error"),
    details: text("details"),
  },
  table => ({
    runIdIndex: uniqueIndex("job_runs_run_id_idx").on(table.runId),
    jobStartedIndex: uniqueIndex("job_runs_job_started_idx").on(
      table.jobName,
      table.startedAt,
      table.runId
    ),
  })
);

export type JobRun = typeof jobRuns.$inferSelect;

export const news = mysqlTable("news", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("assetId"),
  title: varchar("title", { length: 240 }).notNull(),
  summary: text("summary"),
  sourceName: varchar("sourceName", { length: 100 }).notNull(),
  url: text("url").notNull(),
  category: varchar("category", { length: 40 }).notNull(),
  publishedAt: timestamp("publishedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NewsItem = typeof news.$inferSelect;

export const economicEvents = mysqlTable("economicEvents", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  category: varchar("category", { length: 48 }).notNull(),
  country: varchar("country", { length: 8 }).notNull().default("BR"),
  importance: mysqlEnum("importance", ["LOW", "MEDIUM", "HIGH"])
    .notNull()
    .default("MEDIUM"),
  eventDate: timestamp("eventDate").notNull(),
  actual: varchar("actual", { length: 80 }),
  forecast: varchar("forecast", { length: 80 }),
  previous: varchar("previous", { length: 80 }),
  sourceName: varchar("sourceName", { length: 100 })
    .notNull()
    .default("calendar"),
});

export type EconomicEvent = typeof economicEvents.$inferSelect;

export const dividends = mysqlTable("dividends", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("assetId").notNull(),
  eventDate: timestamp("eventDate").notNull(),
  amountPerShare: decimal("amountPerShare", {
    precision: 18,
    scale: 6,
  }).notNull(),
  kind: varchar("kind", { length: 24 }).notNull().default("DIVIDEND"),
  sourceName: varchar("sourceName", { length: 100 })
    .notNull()
    .default("catalog"),
});

export type Dividend = typeof dividends.$inferSelect;

export const cvmFinancialSnapshots = mysqlTable(
  "cvmFinancialSnapshots",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    assetId: int("assetId").notNull(),
    cnpj: varchar("cnpj", { length: 18 }).notNull(),
    cvmCode: varchar("cvmCode", { length: 16 }).notNull(),
    companyName: varchar("companyName", { length: 200 }).notNull(),
    filing: mysqlEnum("filing", ["ITR", "DFP"]).notNull(),
    referenceDate: varchar("referenceDate", { length: 10 }).notNull(),
    periodStart: varchar("periodStart", { length: 10 }).notNull(),
    periodEnd: varchar("periodEnd", { length: 10 }).notNull(),
    version: int("version").notNull(),
    revenue: decimal("revenue", { precision: 26, scale: 2 }),
    netIncome: decimal("netIncome", { precision: 26, scale: 2 }),
    totalAssets: decimal("totalAssets", { precision: 26, scale: 2 }),
    equity: decimal("equity", { precision: 26, scale: 2 }),
    comparativeRevenue: decimal("comparativeRevenue", { precision: 26, scale: 2 }),
    comparativeNetIncome: decimal("comparativeNetIncome", { precision: 26, scale: 2 }),
    comparativeTotalAssets: decimal("comparativeTotalAssets", { precision: 26, scale: 2 }),
    comparativeEquity: decimal("comparativeEquity", { precision: 26, scale: 2 }),
    sourceUrl: text("sourceUrl").notNull(),
    sourceAsOf: timestamp("sourceAsOf").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    filingVersionIndex: uniqueIndex("cvm_snapshot_asset_filing_ref_version_idx").on(
      table.assetId,
      table.filing,
      table.referenceDate,
      table.version
    ),
  })
);

export const cvmQuarterlyFinancials = mysqlTable(
  "cvmQuarterlyFinancials",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    assetId: int("assetId").notNull(),
    periodStart: varchar("periodStart", { length: 10 }).notNull(),
    periodEnd: varchar("periodEnd", { length: 10 }).notNull(),
    revenue: decimal("revenue", { precision: 26, scale: 2 }).notNull(),
    netIncome: decimal("netIncome", { precision: 26, scale: 2 }),
    netMargin: decimal("netMargin", { precision: 14, scale: 6 }),
    sourceAsOf: timestamp("sourceAsOf").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    assetPeriodIndex: uniqueIndex("cvm_quarterly_asset_period_idx").on(
      table.assetId,
      table.periodEnd
    ),
  })
);

export const userPreferences = mysqlTable("userPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  theme: mysqlEnum("theme", ["light", "dark", "system"])
    .notNull()
    .default("system"),
  dashboardLayout: text("dashboardLayout"),
  emailAlerts: tinyint("emailAlerts").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserPreferences = typeof userPreferences.$inferSelect;
