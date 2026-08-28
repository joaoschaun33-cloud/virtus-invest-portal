import { randomBytes } from "node:crypto";

const siteUrl =
  process.env.VIRTUS_TEST_URL ?? "https://www.virtusinvestimentos.com.br";
const apiKey = process.env.FIREBASE_WEB_API_KEY;
if (!apiKey) throw new Error("FIREBASE_WEB_API_KEY is required");
if (process.env.CONFIRM_PRODUCTION_ISOLATION_TEST !== "yes") {
  throw new Error(
    "Set CONFIRM_PRODUCTION_ISOLATION_TEST=yes to run the disposable-account test"
  );
}

type TestAccount = { email: string; idToken: string };

async function signUp(label: string): Promise<TestAccount> {
  const suffix = `${Date.now()}-${randomBytes(4).toString("hex")}`;
  const email = `virtus-isolation-${label}-${suffix}@example.com`;
  const password = `V!${randomBytes(24).toString("base64url")}9a`;
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const payload = await response.json();
  if (!response.ok || !payload.idToken) {
    throw new Error(
      `Firebase sign-up failed (${response.status}): ${JSON.stringify(payload)}`
    );
  }
  return { email, idToken: payload.idToken };
}

async function trpc(
  account: TestAccount,
  path: string,
  input: unknown,
  mutation = false
) {
  const endpoint = `${siteUrl}/api/trpc/${path}`;
  const response = await fetch(
    mutation
      ? endpoint
      : `${endpoint}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`,
    {
      method: mutation ? "POST" : "GET",
      headers: {
        authorization: `Bearer ${account.idToken}`,
        ...(mutation ? { "content-type": "application/json" } : {}),
      },
      body: mutation ? JSON.stringify({ json: input }) : undefined,
    }
  );
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(
      `${path} failed (${response.status}): ${JSON.stringify(payload)}`
    );
    Object.assign(error, { status: response.status });
    throw error;
  }
  return payload.result?.data?.json;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Isolation assertion failed: ${message}`);
}

async function attemptForeignDelete(
  action: () => Promise<unknown>,
  resource: string
) {
  try {
    await action();
  } catch (error) {
    const status = (error as { status?: number }).status;
    assert(
      status === 403 || status === 404,
      `${resource} deletion must be rejected with 403 or 404`
    );
    return;
  }
}

async function deleteAccount(account: TestAccount | undefined) {
  if (!account) return;
  try {
    await trpc(
      account,
      "portfolio.deleteAccount",
      { confirmation: "EXCLUIR MINHA CONTA" },
      true
    );
  } catch (error) {
    console.error(`[cleanup] Could not delete ${account.email}`, error);
  }
}

let accountA: TestAccount | undefined;
let accountB: TestAccount | undefined;

try {
  accountA = await signUp("a");
  accountB = await signUp("b");

  await trpc(
    accountA,
    "portfolio.addTransaction",
    {
      ticker: "PETR4",
      transactionType: "BUY",
      quantity: 11,
      unitPrice: 31.11,
      fees: 0,
      transactionDate: "2026-08-19",
    },
    true
  );
  await trpc(
    accountB,
    "portfolio.addTransaction",
    {
      ticker: "PETR4",
      transactionType: "BUY",
      quantity: 22,
      unitPrice: 32.22,
      fees: 0,
      transactionDate: "2026-08-19",
    },
    true
  );
  await trpc(
    accountA,
    "portfolio.savePreferences",
    { theme: "light", emailAlerts: false },
    true
  );
  await trpc(
    accountB,
    "portfolio.savePreferences",
    { theme: "dark", emailAlerts: true },
    true
  );
  await trpc(
    accountB,
    "portfolio.createAlert",
    {
      ticker: "PETR4",
      targetPrice: 999.22,
      condition: "ABOVE",
      emailEnabled: false,
    },
    true
  );

  const transactionsA = await trpc(accountA, "portfolio.transactions", null);
  const transactionsB = await trpc(accountB, "portfolio.transactions", null);
  assert(
    transactionsA.length === 1 &&
      Number(transactionsA[0].transaction.quantity) === 11,
    "A must see only A's transaction"
  );
  assert(
    transactionsB.length === 1 &&
      Number(transactionsB[0].transaction.quantity) === 22,
    "B must see only B's transaction"
  );

  const foreignTransactionId = transactionsB[0].transaction.id;
  await attemptForeignDelete(
    () =>
      trpc(
        accountA!,
        "portfolio.deleteTransaction",
        { id: foreignTransactionId },
        true
      ),
    "transaction"
  );
  const transactionsBAfterAttack = await trpc(
    accountB,
    "portfolio.transactions",
    null
  );
  assert(
    transactionsBAfterAttack.length === 1,
    "A must not delete B's transaction by guessed id"
  );

  const alertsB = await trpc(accountB, "portfolio.alerts", null);
  assert(alertsB.length === 1, "B must see B's alert");
  await attemptForeignDelete(
    () =>
      trpc(
        accountA!,
        "portfolio.deleteAlert",
        { id: alertsB[0].alert.id },
        true
      ),
    "alert"
  );
  const alertsBAfterAttack = await trpc(accountB, "portfolio.alerts", null);
  assert(
    alertsBAfterAttack.length === 1,
    "A must not delete B's alert by guessed id"
  );

  const preferencesA = await trpc(accountA, "portfolio.preferences", null);
  const preferencesB = await trpc(accountB, "portfolio.preferences", null);
  assert(
    preferencesA.theme === "light" && preferencesA.emailAlerts === 0,
    "A must receive only A's preferences"
  );
  assert(
    preferencesB.theme === "dark" && preferencesB.emailAlerts === 1,
    "B must receive only B's preferences"
  );

  await trpc(accountA, "portfolio.recordConsent", { value: "analytics", policyVersion: "2026-08-25" }, true);
  await trpc(accountA, "portfolio.recordConsent", { value: "analytics", policyVersion: "2026-08-25" }, true);
  await trpc(accountA, "portfolio.recordConsent", { value: "necessary", policyVersion: "2026-08-25" }, true);
  await trpc(accountB, "portfolio.recordConsent", { value: "necessary", policyVersion: "2026-08-25" }, true);

  const exportA = await trpc(accountA, "portfolio.exportData", null);
  const exportB = await trpc(accountB, "portfolio.exportData", null);
  assert(
    exportA.profile.email === accountA.email,
    "A export must contain A's identity"
  );
  assert(
    exportB.profile.email === accountB.email,
    "B export must contain B's identity"
  );
  assert(
    exportA.transactions.length === 1 && exportB.transactions.length === 1,
    "exports must remain isolated"
  );
  assert(
    exportA.consentHistory.length === 2 && exportA.consentHistory[0].value === "necessary",
    "A export must contain deduplicated consent and revocation history"
  );
  assert(
    exportB.consentHistory.length === 1 && exportB.consentHistory[0].value === "necessary",
    "consent history must remain isolated between accounts"
  );

  await deleteAccount(accountA);
  let deletedTokenRejected = false;
  try {
    await trpc(accountA, "portfolio.transactions", null);
  } catch (error) {
    deletedTokenRejected = (error as { status?: number }).status === 401;
  }
  assert(
    deletedTokenRejected,
    "a deleted Firebase identity must no longer access protected data"
  );
  accountA = undefined;

  console.log(
    JSON.stringify({
      status: "passed",
      checks: [
        "read isolation",
        "foreign transaction deletion blocked",
        "foreign alert deletion blocked",
        "consent history deduplicated and isolated",
        "preference isolation",
        "export isolation",
        "deleted identity rejected",
      ],
    })
  );
} finally {
  await deleteAccount(accountA);
  await deleteAccount(accountB);
}
