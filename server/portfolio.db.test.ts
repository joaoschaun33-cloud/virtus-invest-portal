import { afterEach, describe, expect, it } from "vitest";
import { assets, transactions, watchlists } from "../drizzle/schema";
import { clearDbForTests, getPortfolioSummary, getWatchlist, addWatchlist, removeWatchlist, setDbForTests } from "./db";

const TEST_USER_ID = 42;
const asset = { id: 7, ticker: "PETR4", name: "Petrobras PN", lastPrice: "40", currency: "BRL" };

const state = {
  watchlistRows: [] as Array<{ id: number; userId: number; assetId: number; createdAt: Date }>,
  transactionRows: [] as Array<{ userId: number; asset: typeof asset; transaction: { transactionType: "BUY" | "SELL"; quantity: string; unitPrice: string; fees: string } }>,
};

let requestedUserId = TEST_USER_ID;
let mutationUserId = TEST_USER_ID;
let mutationAssetId = asset.id;

const fakeDb = {
  select: () => ({
    from: (table: unknown) => {
      if (table === watchlists) {
        return {
          innerJoin: () => ({
            where: () => ({
              orderBy: async () => state.watchlistRows
                .filter(row => row.userId === requestedUserId)
                .map(row => ({ watchlistId: row.id, asset, createdAt: row.createdAt })),
            }),
          }),
        };
      }
      if (table === transactions) {
        return {
          innerJoin: () => ({
            where: () => ({
              orderBy: async () => state.transactionRows.filter(row => row.userId === requestedUserId),
            }),
          }),
        };
      }
      throw new Error("Unexpected table in fake db select");
    },
  }),
  insert: (table: unknown) => ({
    values: (value: { userId: number; assetId: number }) => ({
      onDuplicateKeyUpdate: async () => {
        if (table === watchlists && !state.watchlistRows.some(row => row.userId === value.userId && row.assetId === value.assetId)) {
          state.watchlistRows.push({ id: state.watchlistRows.length + 1, userId: value.userId, assetId: value.assetId, createdAt: new Date("2026-08-15T00:00:00.000Z") });
        }
      },
    }),
  }),
  delete: (table: unknown) => ({
    where: async () => {
      if (table === watchlists) state.watchlistRows = state.watchlistRows.filter(row => !(row.userId === mutationUserId && row.assetId === mutationAssetId));
    },
  }),
};

afterEach(() => {
  state.watchlistRows = [];
  state.transactionRows = [];
  requestedUserId = TEST_USER_ID;
  mutationUserId = TEST_USER_ID;
  mutationAssetId = asset.id;
  clearDbForTests();
});

describe("watchlist helpers reais", () => {
  it("adiciona uma vez, mantém idempotência e remove pelo usuário e ativo", async () => {
    setDbForTests(fakeDb);
    await addWatchlist(TEST_USER_ID, asset.id);
    await addWatchlist(TEST_USER_ID, asset.id);
    expect((await getWatchlist(TEST_USER_ID))).toHaveLength(1);

    mutationUserId = TEST_USER_ID;
    mutationAssetId = asset.id;
    await removeWatchlist(TEST_USER_ID, asset.id);
    expect(await getWatchlist(TEST_USER_ID)).toEqual([]);
  });

  it("retorna estado vazio para outro usuário sem vazar a watchlist", async () => {
    setDbForTests(fakeDb);
    await addWatchlist(TEST_USER_ID, asset.id);
    requestedUserId = 99;
    expect(await getWatchlist(99)).toEqual([]);
  });
});

describe("getPortfolioSummary integrado ao listTransactions", () => {
  it("consolida as transações retornadas pelo helper real", async () => {
    setDbForTests(fakeDb);
    state.transactionRows.push(
      { userId: TEST_USER_ID, asset, transaction: { transactionType: "BUY", quantity: "10", unitPrice: "30", fees: "0" } },
      { userId: TEST_USER_ID, asset, transaction: { transactionType: "SELL", quantity: "2", unitPrice: "35", fees: "0" } },
    );

    const summary = await getPortfolioSummary(TEST_USER_ID);
    expect(summary).toHaveLength(1);
    expect(summary[0]).toMatchObject({ quantity: 8, invested: 240, currentValue: 320, profit: 80 });
  });

  it("retorna vazio quando listTransactions não encontra operações", async () => {
    setDbForTests(fakeDb);
    expect(await getPortfolioSummary(TEST_USER_ID)).toEqual([]);
  });
});
