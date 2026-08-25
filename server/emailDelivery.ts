import { and, eq, lt } from "drizzle-orm";
import { emailDeliveries } from "../drizzle/schema";
import { logger } from "./_core/logger";
import { withDistributedLock } from "./reliability";

type DeliveryState = {
  status: "pending" | "sent" | "failed";
  expiresAt: number;
  attempts: number;
  resendId?: string;
};

const localDeliveries = new Map<string, DeliveryState>();
const PENDING_TTL_MS = 10 * 60_000;
const SENT_TTL_MS = 90 * 86400_000;

async function database() {
  const { getDb } = await import("./db");
  return getDb();
}

async function reserveEmailDeliveryUnsafe(idempotencyKey: string) {
  const now = new Date();
  const pendingExpiry = new Date(now.getTime() + PENDING_TTL_MS);
  const db = await database();

  if (!db) {
    const existing = localDeliveries.get(idempotencyKey);
    if (existing?.status === "sent") return false;
    if (existing?.status === "pending" && existing.expiresAt > now.valueOf()) return false;
    localDeliveries.set(idempotencyKey, {
      status: "pending",
      expiresAt: pendingExpiry.valueOf(),
      attempts: (existing?.attempts ?? 0) + 1,
    });
    return true;
  }

  const existing = await db
    .select()
    .from(emailDeliveries)
    .where(eq(emailDeliveries.idempotencyKey, idempotencyKey))
    .limit(1);
  const current = existing[0];
  if (current?.status === "sent") return false;
  if (current?.status === "pending" && current.expiresAt > now) return false;

  try {
    if (current) {
      await db
        .update(emailDeliveries)
        .set({
          status: "pending",
          attempts: current.attempts + 1,
          lastError: null,
          expiresAt: pendingExpiry,
        })
        .where(
          and(
            eq(emailDeliveries.id, current.id),
            current.status === "pending"
              ? eq(emailDeliveries.expiresAt, current.expiresAt)
              : eq(emailDeliveries.status, current.status)
          )
        );
    } else {
      await db.insert(emailDeliveries).values({
        idempotencyKey,
        status: "pending",
        attempts: 1,
        expiresAt: pendingExpiry,
      });
    }
    return true;
  } catch (error) {
    // A concurrent worker may have inserted the same key. It must not send.
    logger.warn("email.idempotency_reservation_conflict", {
      idempotencyKey,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function reserveEmailDelivery(idempotencyKey: string) {
  const result = await withDistributedLock(
    `virtus:email-reservation:${idempotencyKey}`,
    () => reserveEmailDeliveryUnsafe(idempotencyKey)
  );
  return result ?? false;
}

export async function markEmailDeliverySent(
  idempotencyKey: string,
  resendId?: string
) {
  const db = await database();
  const sentAt = new Date();
  const expiresAt = new Date(sentAt.getTime() + SENT_TTL_MS);
  if (!db) {
    const current = localDeliveries.get(idempotencyKey);
    if (current)
      localDeliveries.set(idempotencyKey, {
        ...current,
        status: "sent",
        resendId,
        expiresAt: expiresAt.valueOf(),
      });
    return;
  }
  await db
    .update(emailDeliveries)
    .set({ status: "sent", sentAt, resendId: resendId ?? null, lastError: null, expiresAt })
    .where(eq(emailDeliveries.idempotencyKey, idempotencyKey));
}

export async function markEmailDeliveryFailed(idempotencyKey: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const db = await database();
  if (!db) {
    const current = localDeliveries.get(idempotencyKey);
    if (current) localDeliveries.set(idempotencyKey, { ...current, status: "failed", expiresAt: 0 });
    return;
  }
  await db
    .update(emailDeliveries)
    .set({ status: "failed", lastError: message.slice(0, 2000), expiresAt: new Date() })
    .where(eq(emailDeliveries.idempotencyKey, idempotencyKey));
}

export async function cleanupExpiredEmailDeliveries(now = new Date()) {
  const db = await database();
  if (!db) {
    let removed = 0;
    for (const [key, value] of Array.from(localDeliveries.entries())) {
      if (value.expiresAt <= now.valueOf()) {
        localDeliveries.delete(key);
        removed += 1;
      }
    }
    return removed;
  }
  const result = await db
    .delete(emailDeliveries)
    .where(lt(emailDeliveries.expiresAt, now));
  return Number((result as { affectedRows?: number }).affectedRows ?? 0);
}

export function clearEmailDeliveriesForTests() {
  localDeliveries.clear();
}
