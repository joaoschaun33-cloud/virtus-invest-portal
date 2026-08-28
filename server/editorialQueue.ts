import { and, desc, eq, inArray } from "drizzle-orm";
import { editorialCorrections, editorialDrafts, type EditorialDraftRow } from "../drizzle/schema";
import { getDb } from "./db";
import { ensureEditorialOperationActive } from "./editorialControl";
import { setEditorialOperationState } from "./editorialControl";
import { correctionRequiresPause, validateEditorialCorrection, type EditorialCorrectionKind } from "./editorialCorrection";
import {
  approveEditorialDraft,
  createEditorialDraft,
  recordEditorialPublication,
  rejectEditorialDraft,
  type EditorialDraft,
  type EditorialSlot,
  type EditorialSource,
  type EditorialStatus,
} from "./editorialWorkflow";

function parseArray<T>(value: string): T[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function editorialRowToDraft(row: EditorialDraftRow): EditorialDraft {
  return {
    id: row.id,
    slot: row.slot,
    title: row.title,
    body: row.body,
    facts: parseArray<string>(row.facts),
    sources: parseArray<EditorialSource>(row.sources),
    issues: parseArray<string>(row.issues),
    status: row.status,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    approvedBy: row.reviewedBy ?? undefined,
    approvedAt: row.reviewedAt?.toISOString(),
    reviewNote: row.reviewNote ?? undefined,
    publishedBy: row.publishedBy ?? undefined,
    publishedAt: row.publishedAt?.toISOString(),
    publishedChannel: row.publishedChannel ?? undefined,
    publishedUrl: row.publishedUrl ?? undefined,
  };
}

async function requiredDb() {
  const db = await getDb();
  if (!db) throw new Error("Fila editorial indisponível sem banco de dados.");
  return db;
}

export async function enqueueEditorialDraft(input: {
  generationKey: string;
  slot: EditorialSlot;
  title: string;
  body: string;
  facts: string[];
  sources: EditorialSource[];
  createdBy: string;
  scheduledFor?: Date;
}) {
  await ensureEditorialOperationActive("gerar");
  const db = await requiredDb();
  const draft = createEditorialDraft(input);
  await db
    .insert(editorialDrafts)
    .values({
      id: draft.id,
      generationKey: input.generationKey,
      slot: draft.slot,
      title: draft.title,
      body: draft.body,
      facts: JSON.stringify(draft.facts),
      sources: JSON.stringify(draft.sources),
      issues: JSON.stringify(draft.issues),
      status: draft.status,
      createdBy: draft.createdBy,
      scheduledFor: input.scheduledFor,
    })
    .onDuplicateKeyUpdate({ set: { generationKey: input.generationKey } });
  const [stored] = await db
    .select()
    .from(editorialDrafts)
    .where(eq(editorialDrafts.generationKey, input.generationKey))
    .limit(1);
  if (!stored) throw new Error("Não foi possível recuperar o rascunho editorial.");
  return editorialRowToDraft(stored);
}

export async function listEditorialDrafts(input?: {
  status?: EditorialStatus;
  limit?: number;
}) {
  const db = await requiredDb();
  const rows = await db
    .select()
    .from(editorialDrafts)
    .where(input?.status ? eq(editorialDrafts.status, input.status) : undefined)
    .orderBy(desc(editorialDrafts.createdAt))
    .limit(Math.max(1, Math.min(input?.limit ?? 50, 100)));
  const corrections = rows.length ? await db.select().from(editorialCorrections).where(inArray(editorialCorrections.draftId, rows.map(row => row.id))).orderBy(desc(editorialCorrections.createdAt)) : [];
  return rows.map(row => ({
    ...editorialRowToDraft(row),
    corrections: corrections.filter(correction => correction.draftId === row.id).map(correction => ({
      id: correction.id,
      kind: correction.kind,
      reason: correction.reason,
      correctionText: correction.correctionText,
      correctionUrl: correction.correctionUrl ?? undefined,
      createdBy: correction.createdBy,
      createdAt: correction.createdAt.toISOString(),
    })),
  }));
}

export async function recordQueuedEditorialCorrection(id: string, input: {
  kind: EditorialCorrectionKind;
  reason: string;
  correctionText: string;
  correctionUrl?: string;
  createdBy: string;
}) {
  const validated = validateEditorialCorrection(input);
  const { db, row } = await getEditorialRow(id);
  if (row.status !== "published") throw new Error("Somente uma publicação registrada pode receber correção.");
  if (correctionRequiresPause(validated.kind)) {
    await setEditorialOperationState({ paused: true, reason: `Correção ${validated.kind === "retraction" ? "com retirada" : "material"}: ${validated.reason}`, updatedBy: input.createdBy });
  }
  await db.insert(editorialCorrections).values({
    draftId: id,
    kind: validated.kind,
    reason: validated.reason,
    correctionText: validated.correctionText,
    correctionUrl: validated.correctionUrl,
    createdBy: input.createdBy,
  });
  return { recorded: true, operationPaused: correctionRequiresPause(validated.kind) };
}

async function getEditorialRow(id: string) {
  const db = await requiredDb();
  const [row] = await db
    .select()
    .from(editorialDrafts)
    .where(eq(editorialDrafts.id, id))
    .limit(1);
  if (!row) throw new Error("Rascunho editorial não encontrado.");
  return { db, row };
}

export async function approveQueuedEditorialDraft(id: string, reviewer: string) {
  const { db, row } = await getEditorialRow(id);
  const approved = approveEditorialDraft(editorialRowToDraft(row), reviewer);
  const result = await db
    .update(editorialDrafts)
    .set({
      status: "approved",
      reviewedBy: approved.approvedBy,
      reviewedAt: new Date(approved.approvedAt!),
      reviewNote: null,
    })
    .where(
      and(eq(editorialDrafts.id, id), eq(editorialDrafts.status, "needs_review"))
    );
  if (!(result as { affectedRows?: number }).affectedRows)
    throw new Error("O rascunho já foi revisado.");
  return approved;
}

export async function rejectQueuedEditorialDraft(
  id: string,
  reviewer: string,
  note: string
) {
  const { db, row } = await getEditorialRow(id);
  const rejected = rejectEditorialDraft(editorialRowToDraft(row), reviewer, note);
  const result = await db
    .update(editorialDrafts)
    .set({
      status: "rejected",
      reviewedBy: rejected.approvedBy,
      reviewedAt: new Date(rejected.approvedAt!),
      reviewNote: rejected.reviewNote,
    })
    .where(
      and(eq(editorialDrafts.id, id), eq(editorialDrafts.status, "needs_review"))
    );
  if (!(result as { affectedRows?: number }).affectedRows)
    throw new Error("O rascunho já foi revisado.");
  return rejected;
}

export async function recordQueuedEditorialPublication(
  id: string,
  input: { publisher: string; channel: string; url?: string }
) {
  await ensureEditorialOperationActive("publicar");
  const { db, row } = await getEditorialRow(id);
  const published = recordEditorialPublication(editorialRowToDraft(row), input);
  const result = await db
    .update(editorialDrafts)
    .set({
      status: "published",
      publishedBy: published.publishedBy,
      publishedAt: new Date(published.publishedAt!),
      publishedChannel: published.publishedChannel,
      publishedUrl: published.publishedUrl,
    })
    .where(and(eq(editorialDrafts.id, id), eq(editorialDrafts.status, "approved")));
  if (!(result as { affectedRows?: number }).affectedRows)
    throw new Error("A publicação já foi registrada ou perdeu a aprovação.");
  return published;
}
