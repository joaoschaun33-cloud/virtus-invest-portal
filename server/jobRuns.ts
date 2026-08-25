import { desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { jobRuns } from "../drizzle/schema";
import { logger } from "./_core/logger";

type JobStatus = "running" | "succeeded" | "failed" | "skipped";

type JobRunHandle = {
  id: number;
  runId: string;
  jobName: string;
  startedAt: number;
};

const localRuns = new Map<string, JobRunHandle & { status: JobStatus }>();

async function database() {
  const { getDb } = await import("./db");
  return getDb();
}

export async function startJobRun(
  jobName: string,
  requestId?: string
): Promise<JobRunHandle> {
  const runId = randomUUID();
  const startedAt = Date.now();
  const db = await database();
  if (!db) {
    const handle = { id: 0, runId, jobName, startedAt, status: "running" as const };
    localRuns.set(runId, handle);
    return handle;
  }
  const result = await db.insert(jobRuns).values({
    jobName,
    runId,
    requestId: requestId ?? null,
    status: "running",
    startedAt: new Date(startedAt),
  });
  const id = Number((result as { insertId?: number }).insertId ?? 0);
  return { id, runId, jobName, startedAt };
}

export async function finishJobRun(
  handle: JobRunHandle,
  input: {
    status: Exclude<JobStatus, "running">;
    processed?: number;
    failed?: number;
    error?: unknown;
    details?: Record<string, unknown>;
  }
) {
  const finishedAt = Date.now();
  const errorMessage = input.error instanceof Error ? input.error.message : input.error ? String(input.error) : null;
  const db = await database();
  if (!db) {
    const current = localRuns.get(handle.runId);
    if (current) localRuns.set(handle.runId, { ...current, status: input.status });
    return;
  }
  await db
    .update(jobRuns)
    .set({
      status: input.status,
      finishedAt: new Date(finishedAt),
      durationMs: Math.max(0, finishedAt - handle.startedAt),
      processed: input.processed ?? 0,
      failed: input.failed ?? 0,
      error: errorMessage?.slice(0, 4000) ?? null,
      details: input.details ? JSON.stringify(input.details) : null,
    })
    .where(eq(jobRuns.runId, handle.runId));
  if (input.status === "failed") {
    logger.error("job.failed", input.error, {
      jobName: handle.jobName,
      runId: handle.runId,
    });
  }
}

export async function listRecentJobRuns(limit = 50) {
  const db = await database();
  if (!db) return Array.from(localRuns.values()).slice(-limit).reverse();
  return db
    .select()
    .from(jobRuns)
    .orderBy(desc(jobRuns.startedAt))
    .limit(Math.min(Math.max(limit, 1), 200));
}

export function clearJobRunsForTests() {
  localRuns.clear();
}
