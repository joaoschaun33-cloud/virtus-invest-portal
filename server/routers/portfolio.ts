import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router, publicProcedure } from "../_core/trpc";
import {
  addWatchlist,
  createAlert,
  deleteAlert,
  createTransaction,
  createTransactions,
  deleteTransaction,
  deleteUserAccountData,
  getPortfolioSummary,
  getPortfolioPerformance,
  getPortfolioDividendIncome,
  getPreferences,
  getWatchlist,
  listAlerts,
  listDividends,
  listNotifications,
  listTransactions,
  listConsentRecords,
  markNotificationRead,
  removeWatchlist,
  savePreferences,
  recordUserConsent,
  toggleAlert,
} from "../db";
import { getAssetByTicker } from "../db";
import { deleteFirebaseUser } from "../_core/firebaseAuth";
import { hasValidPositionLedger } from "../portfolioLogic";
import { getStoredAssetSnapshot } from "../assetSnapshot";
import { logger } from "../_core/logger";

export type ManualTransactionValidationInput = {
  transactionType: "BUY" | "SELL";
  quantity: number;
  transactionDate: string;
};

export function validateManualTransaction(
  input: ManualTransactionValidationInput,
  options: { assetExists: boolean; availableQuantity?: number }
) {
  if (!options.assetExists) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Ativo não encontrado no catálogo.",
    });
  }

  const transactionDate = new Date(input.transactionDate);
  if (Number.isNaN(transactionDate.valueOf())) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Informe uma data válida para a operação.",
    });
  }

  if (
    input.transactionType === "SELL" &&
    (options.availableQuantity ?? 0) < input.quantity
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A venda não pode exceder a posição manual cadastrada.",
    });
  }

  return transactionDate;
}

export const portfolioRouter = router({
  watchlist: protectedProcedure.query(async ({ ctx }) => {
    const rows = await getWatchlist(ctx.user.id);
    // Normalize each raw joined asset row into the canonical AssetSnapshot
    // shape so every page that renders a watchlist item (Home, Markets,
    // AssetDetail) sees the same price/change fields as the main market
    // list, instead of the unprocessed DB row (see ADR on canonical
    // snapshots — market.assets already does this via listAssetsWithLiveQuotes).
    return rows.map(row => ({
      watchlistId: row.watchlistId,
      asset: getStoredAssetSnapshot(row.asset),
      createdAt: row.createdAt,
    }));
  }),
  addToWatchlist: protectedProcedure
    .input(z.object({ assetId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await addWatchlist(ctx.user.id, input.assetId);
      return { ok: true };
    }),
  removeFromWatchlist: protectedProcedure
    .input(z.object({ assetId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await removeWatchlist(ctx.user.id, input.assetId);
      return { ok: true };
    }),
  summary: protectedProcedure.query(({ ctx }) =>
    getPortfolioSummary(ctx.user.id)
  ),
  performance: protectedProcedure.query(({ ctx }) =>
    getPortfolioPerformance(ctx.user.id)
  ),
  dividendIncome: protectedProcedure.query(({ ctx }) =>
    getPortfolioDividendIncome(ctx.user.id)
  ),
  transactions: protectedProcedure.query(({ ctx }) =>
    listTransactions(ctx.user.id)
  ),
  addTransaction: protectedProcedure
    .input(
      z.object({
        ticker: z.string().trim().min(1).max(32),
        transactionType: z.enum(["BUY", "SELL"]),
        quantity: z.number().positive(),
        unitPrice: z.number().positive(),
        fees: z.number().min(0).default(0),
        transactionDate: z.string().min(1).max(32),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const asset = await getAssetByTicker(input.ticker);
      const position =
        asset && input.transactionType === "SELL"
          ? (await getPortfolioSummary(ctx.user.id)).find(
              item => item.asset.id === asset.id
            )
          : undefined;
      const transactionDate = validateManualTransaction(input, {
        assetExists: Boolean(asset),
        availableQuantity: position?.quantity,
      });
      await createTransaction(ctx.user.id, {
        assetId: asset!.id,
        transactionType: input.transactionType,
        quantity: input.quantity.toFixed(6),
        unitPrice: input.unitPrice.toFixed(6),
        fees: input.fees.toFixed(6),
        transactionDate,
      });
      return { ok: true };
    }),
  importTransactions: protectedProcedure
    .input(
      z.object({
        rows: z
          .array(
            z.object({
              line: z.number().int().positive(),
              ticker: z.string().trim().min(1).max(32),
              transactionType: z.enum(["BUY", "SELL"]),
              quantity: z.number().positive(),
              unitPrice: z.number().positive(),
              fees: z.number().min(0),
              transactionDate: z.string().min(1),
            })
          )
          .min(1)
          .max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await listTransactions(ctx.user.id);
      const quantityByAsset = new Map<number, number>();
      for (const row of existing) {
        const quantity = Number(row.transaction.quantity);
        quantityByAsset.set(
          row.asset.id,
          (quantityByAsset.get(row.asset.id) ?? 0) +
            (row.transaction.transactionType === "BUY" ? quantity : -quantity)
        );
      }
      const transactionKey = (value: {
        ticker: string;
        transactionType: string;
        quantity: number | string;
        unitPrice: number | string;
        fees: number | string;
        transactionDate: string | Date;
      }) =>
        [
          value.ticker.toUpperCase(),
          value.transactionType,
          Number(value.quantity).toFixed(6),
          Number(value.unitPrice).toFixed(6),
          Number(value.fees).toFixed(6),
          new Date(value.transactionDate).toISOString().slice(0, 10),
        ].join("|");
      const knownKeys = new Set(
        existing.map(row =>
          transactionKey({
            ticker: row.asset.ticker,
            transactionType: row.transaction.transactionType,
            quantity: row.transaction.quantity,
            unitPrice: row.transaction.unitPrice,
            fees: row.transaction.fees,
            transactionDate: row.transaction.transactionDate,
          })
        )
      );
      const accepted: Array<{
        assetId: number;
        transactionType: "BUY" | "SELL";
        quantity: string;
        unitPrice: string;
        fees: string;
        transactionDate: Date;
      }> = [];
      const rejected: Array<{ line: number; reason: string }> = [];
      let duplicates = 0;

      const ordered = [...input.rows].sort(
        (left, right) =>
          new Date(left.transactionDate).valueOf() -
            new Date(right.transactionDate).valueOf() || left.line - right.line
      );
      for (const row of ordered) {
        const transactionDate = new Date(`${row.transactionDate}T12:00:00`);
        if (Number.isNaN(transactionDate.valueOf())) {
          rejected.push({ line: row.line, reason: "Data inválida." });
          continue;
        }
        const asset = await getAssetByTicker(row.ticker);
        if (!asset) {
          rejected.push({
            line: row.line,
            reason: `Ativo ${row.ticker.toUpperCase()} não encontrado no catálogo.`,
          });
          continue;
        }
        const key = transactionKey(row);
        if (knownKeys.has(key)) {
          duplicates += 1;
          continue;
        }
        const available = quantityByAsset.get(asset.id) ?? 0;
        if (row.transactionType === "SELL" && row.quantity > available) {
          rejected.push({
            line: row.line,
            reason: `Venda de ${row.ticker.toUpperCase()} excede o saldo disponível.`,
          });
          continue;
        }
        quantityByAsset.set(
          asset.id,
          available +
            (row.transactionType === "BUY" ? row.quantity : -row.quantity)
        );
        knownKeys.add(key);
        accepted.push({
          assetId: asset.id,
          transactionType: row.transactionType,
          quantity: row.quantity.toFixed(6),
          unitPrice: row.unitPrice.toFixed(6),
          fees: row.fees.toFixed(6),
          transactionDate,
        });
      }
      await createTransactions(ctx.user.id, accepted);
      return { imported: accepted.length, duplicates, rejected };
    }),
  deleteTransaction: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const current = await listTransactions(ctx.user.id);
      const target = current.find(row => row.transaction?.id === input.id);
      if (!target)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Operação não encontrada.",
        });
      const remaining = current.filter(row => row.transaction.id !== input.id);
      if (!hasValidPositionLedger(remaining))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Esta exclusão deixaria uma venda posterior sem saldo. Exclua ou ajuste primeiro as operações posteriores.",
        });
      await deleteTransaction(ctx.user.id, input.id);
      return { ok: true };
    }),
  alerts: protectedProcedure.query(({ ctx }) => listAlerts(ctx.user.id)),
  createAlert: protectedProcedure
    .input(
      z.object({
        ticker: z.string().trim().min(1).max(32),
        targetPrice: z.number().positive(),
        condition: z.enum(["ABOVE", "BELOW"]),
        emailEnabled: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const asset = await getAssetByTicker(input.ticker);
      if (!asset)
        return { ok: false, message: "Ativo não encontrado no catálogo." };
      await createAlert(ctx.user.id, {
        assetId: asset.id,
        targetPrice: input.targetPrice.toFixed(6),
        condition: input.condition,
        isActive: 1,
      });
      return { ok: true, emailEnabled: input.emailEnabled };
    }),
  toggleAlert: protectedProcedure
    .input(z.object({ id: z.number().int().positive(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await toggleAlert(ctx.user.id, input.id, input.isActive);
      return { ok: true };
    }),
  deleteAlert: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await deleteAlert(ctx.user.id, input.id);
      return { ok: true };
    }),
  notifications: protectedProcedure.query(({ ctx }) =>
    listNotifications(ctx.user.id)
  ),
  markNotificationRead: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await markNotificationRead(ctx.user.id, input.id);
      return { ok: true };
    }),
  preferences: protectedProcedure.query(({ ctx }) =>
    getPreferences(ctx.user.id)
  ),
  exportData: protectedProcedure.query(async ({ ctx }) => {
    const [watchlist, transactions, alerts, notifications, preferences, consentHistory] =
      await Promise.all([
        getWatchlist(ctx.user.id),
        listTransactions(ctx.user.id),
        listAlerts(ctx.user.id),
        listNotifications(ctx.user.id),
        getPreferences(ctx.user.id),
        listConsentRecords(ctx.user.id),
      ]);
    return {
      exportedAt: new Date().toISOString(),
      profile: {
        name: ctx.user.name ?? null,
        email: ctx.user.email ?? null,
        createdAt: ctx.user.createdAt,
        lastSignedIn: ctx.user.lastSignedIn,
      },
      preferences,
      watchlist,
      transactions,
      alerts,
      notifications,
      consentHistory,
    };
  }),
  recordConsent: protectedProcedure
    .input(z.object({ value: z.enum(["necessary", "analytics"]), policyVersion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .mutation(({ ctx, input }) => recordUserConsent(ctx.user.id, input)),
  deleteAccount: protectedProcedure
    .input(z.object({ confirmation: z.literal("EXCLUIR MINHA CONTA") }))
    .mutation(async ({ ctx }) => {
      if (ctx.user.role === "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "A conta administradora principal exige transferência de responsabilidade antes da exclusão.",
        });
      }
      await deleteUserAccountData(ctx.user.id);
      try {
        await deleteFirebaseUser(ctx.user.openId);
      } catch (error) {
        logger.error("privacy-firebase-user-deletion-failed", error, {
          userId: ctx.user.id,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Seus dados foram removidos, mas a identidade de acesso requer nova tentativa. Entre novamente e conclua a exclusão.",
        });
      }
      return { ok: true };
    }),
  savePreferences: protectedProcedure
    .input(
      z.object({
        theme: z.enum(["light", "dark", "system"]).optional(),
        dashboardLayout: z.string().max(10_000).optional(),
        guideProgress: z.string().max(5_000).optional(),
        emailAlerts: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await savePreferences(ctx.user.id, input);
      return { ok: true };
    }),
  compoundInterest: publicProcedure
    .input(
      z.object({
        initial: z.number().min(0),
        monthly: z.number().min(0),
        annualRate: z.number(),
        years: z.number().int().min(1).max(80),
      })
    )
    .query(({ input }) => {
      const months = input.years * 12;
      const monthlyRate = Math.pow(1 + input.annualRate / 100, 1 / 12) - 1;
      let balance = input.initial;
      return Array.from({ length: months + 1 }, (_, month) => {
        if (month > 0) balance = balance * (1 + monthlyRate) + input.monthly;
        const contributed = input.initial + input.monthly * month;
        return { month, balance, contributed, interest: balance - contributed };
      });
    }),
  dividendHistory: publicProcedure
    .input(z.object({ ticker: z.string().trim().min(1).max(32) }))
    .query(async ({ input }) => {
      const asset = await getAssetByTicker(input.ticker);
      return asset ? listDividends(asset.id) : [];
    }),
});
