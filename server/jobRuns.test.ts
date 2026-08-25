import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

import {
  clearJobRunsForTests,
  finishJobRun,
  listRecentJobRuns,
  startJobRun,
} from "./jobRuns";

describe("job run tracking", () => {
  beforeEach(() => clearJobRunsForTests());

  it("records a successful local run with its final status", async () => {
    const run = await startJobRun("test-job", "request-1");
    await finishJobRun(run, { status: "succeeded", processed: 4 });

    const runs = await listRecentJobRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      jobName: "test-job",
      runId: run.runId,
      status: "succeeded",
    });
  });

  it("records failures with an error message", async () => {
    const run = await startJobRun("test-job");
    await finishJobRun(run, { status: "failed", error: new Error("provider down") });

    const runs = await listRecentJobRuns();
    expect(runs[0]).toMatchObject({ jobName: "test-job", status: "failed" });
  });
});
