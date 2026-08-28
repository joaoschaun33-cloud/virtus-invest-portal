import { eq } from "drizzle-orm";
import { editorialOperations } from "../drizzle/schema";
import { getDb } from "./db";

export type EditorialOperationState = {
  paused: boolean;
  reason?: string;
  updatedBy?: string;
  updatedAt?: string;
};

const CONTROL_ID = 1;

async function requiredDb() {
  const db = await getDb();
  if (!db) throw new Error("Controle editorial indisponível sem banco de dados.");
  return db;
}

export function assertEditorialOperationActive(state: EditorialOperationState, action: "gerar" | "publicar") {
  if (!state.paused) return;
  const context = state.reason ? ` Motivo: ${state.reason}` : "";
  throw new Error(`Operação editorial pausada: não é possível ${action}.${context}`);
}

export async function getEditorialOperationState(): Promise<EditorialOperationState> {
  const db = await requiredDb();
  const [row] = await db.select().from(editorialOperations).where(eq(editorialOperations.id, CONTROL_ID)).limit(1);
  if (!row) return { paused: false };
  return {
    paused: Boolean(row.isPaused),
    reason: row.reason ?? undefined,
    updatedBy: row.updatedBy,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function setEditorialOperationState(input: { paused: boolean; reason?: string; updatedBy: string }) {
  const db = await requiredDb();
  const reason = input.reason?.trim();
  if (input.paused && (!reason || reason.length < 3))
    throw new Error("Informe o motivo da pausa editorial.");
  const updatedAt = new Date();
  await db.insert(editorialOperations).values({
    id: CONTROL_ID,
    isPaused: input.paused ? 1 : 0,
    reason: input.paused ? reason : null,
    updatedBy: input.updatedBy.trim(),
    updatedAt,
  }).onDuplicateKeyUpdate({ set: {
    isPaused: input.paused ? 1 : 0,
    reason: input.paused ? reason : null,
    updatedBy: input.updatedBy.trim(),
    updatedAt,
  }});
  return { paused: input.paused, reason: input.paused ? reason : undefined, updatedBy: input.updatedBy.trim(), updatedAt: updatedAt.toISOString() } satisfies EditorialOperationState;
}

export async function ensureEditorialOperationActive(action: "gerar" | "publicar") {
  assertEditorialOperationActive(await getEditorialOperationState(), action);
}
