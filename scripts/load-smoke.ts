const baseUrl = (process.env.VIRTUS_LOAD_URL ?? "http://localhost:3000").replace(/\/$/, "");
const requests = Math.max(10, Math.min(Number(process.env.VIRTUS_LOAD_REQUESTS ?? 60), 500));
const concurrency = Math.max(1, Math.min(Number(process.env.VIRTUS_LOAD_CONCURRENCY ?? 6), 20));

const paths = [
  "/api/health",
  "/api/ready",
  "/api/trpc/market.assets?batch=1&input=%7B%7D",
  "/api/trpc/market.assets?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22search%22%3A%22PETR4%22%7D%7D%7D",
];

const durations: number[] = [];
const statuses = new Map<number, number>();
let cursor = 0;

async function worker() {
  while (cursor < requests) {
    const index = cursor++;
    const started = performance.now();
    const response = await fetch(`${baseUrl}${paths[index % paths.length]}`, {
      headers: { "User-Agent": "VirtusLoadSmoke/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
    durations.push(performance.now() - started);
    statuses.set(response.status, (statuses.get(response.status) ?? 0) + 1);
    await response.arrayBuffer();
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));
durations.sort((a, b) => a - b);
const percentile = (value: number) =>
  durations[Math.min(durations.length - 1, Math.ceil(durations.length * value) - 1)];
const serverErrors = Array.from(statuses.entries())
  .filter(([status]) => status >= 500)
  .reduce((total, [, count]) => total + count, 0);
const result = {
  baseUrl,
  requests,
  concurrency,
  statusCounts: Object.fromEntries(statuses),
  p50Ms: Math.round(percentile(0.5)),
  p95Ms: Math.round(percentile(0.95)),
  maxMs: Math.round(percentile(1)),
  serverErrors,
};
console.log(JSON.stringify(result, null, 2));
if (serverErrors > 0 || result.p95Ms > 3_000) process.exitCode = 1;
