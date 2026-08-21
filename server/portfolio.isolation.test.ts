import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  addWatchlist: vi.fn(),
  createAlert: vi.fn(),
  createTransaction: vi.fn(),
  createTransactions: vi.fn(),
  deleteAlert: vi.fn(),
  deleteTransaction: vi.fn(),
  deleteUserAccountData: vi.fn(),
  getAssetByTicker: vi.fn(),
  getPortfolioDividendIncome: vi.fn(),
  getPortfolioPerformance: vi.fn(),
  getPortfolioSummary: vi.fn(),
  getPreferences: vi.fn(),
  getWatchlist: vi.fn(),
  listAlerts: vi.fn(),
  listDividends: vi.fn(),
  listNotifications: vi.fn(),
  listTransactions: vi.fn(),
  markNotificationRead: vi.fn(),
  removeWatchlist: vi.fn(),
  savePreferences: vi.fn(),
  toggleAlert: vi.fn(),
}));

vi.mock("./db", () => dbMocks);
vi.mock("./_core/firebaseAuth", () => ({ deleteFirebaseUser: vi.fn() }));

import { portfolioRouter } from "./routers/portfolio";

const userA = {
  id: 101,
  openId: "firebase-a",
  email: "a@example.com",
  name: "Conta A",
  loginMethod: "password",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const userB = {
  ...userA,
  id: 202,
  openId: "firebase-b",
  email: "b@example.com",
  name: "Conta B",
};
const context = (user: typeof userA | null) =>
  ({ user, req: {}, res: {} }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  dbMocks.getWatchlist.mockImplementation(async (userId: number) => [
    { owner: userId },
  ]);
  dbMocks.listTransactions.mockImplementation(async (userId: number) => [
    { owner: userId },
  ]);
  dbMocks.listAlerts.mockImplementation(async (userId: number) => [
    { owner: userId },
  ]);
  dbMocks.listNotifications.mockImplementation(async (userId: number) => [
    { owner: userId },
  ]);
  dbMocks.getPreferences.mockImplementation(async (userId: number) => ({
    owner: userId,
  }));
});

describe("isolamento entre contas no roteador de carteira", () => {
  it("deriva o proprietário da sessão validada em todas as leituras privadas", async () => {
    const callerA = portfolioRouter.createCaller(context(userA));
    const callerB = portfolioRouter.createCaller(context(userB));

    await expect(callerA.transactions()).resolves.toEqual([
      { owner: userA.id },
    ]);
    await expect(callerB.transactions()).resolves.toEqual([
      { owner: userB.id },
    ]);
    await expect(callerA.watchlist()).resolves.toEqual([{ owner: userA.id }]);
    await expect(callerB.alerts()).resolves.toEqual([{ owner: userB.id }]);
    await expect(callerA.notifications()).resolves.toEqual([
      { owner: userA.id },
    ]);
    await expect(callerB.preferences()).resolves.toEqual({ owner: userB.id });
  });

  it("sempre combina o id do objeto com o proprietário autenticado nas mutações", async () => {
    const callerA = portfolioRouter.createCaller(context(userA));
    const foreignTransactionId = 9002;
    const foreignAlertId = 9003;
    const foreignNotificationId = 9004;

    await callerA.deleteTransaction({ id: foreignTransactionId });
    await callerA.toggleAlert({ id: foreignAlertId, isActive: false });
    await callerA.deleteAlert({ id: foreignAlertId });
    await callerA.markNotificationRead({ id: foreignNotificationId });

    expect(dbMocks.deleteTransaction).toHaveBeenCalledWith(
      userA.id,
      foreignTransactionId
    );
    expect(dbMocks.toggleAlert).toHaveBeenCalledWith(
      userA.id,
      foreignAlertId,
      false
    );
    expect(dbMocks.deleteAlert).toHaveBeenCalledWith(userA.id, foreignAlertId);
    expect(dbMocks.markNotificationRead).toHaveBeenCalledWith(
      userA.id,
      foreignNotificationId
    );
  });

  it("recusa todas as leituras privadas sem identidade autenticada", async () => {
    const anonymous = portfolioRouter.createCaller(context(null));

    await expect(anonymous.transactions()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(anonymous.exportData()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(anonymous.alerts()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
