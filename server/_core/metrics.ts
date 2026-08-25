type RequestMetric = {
  count: number;
  errors: number;
  totalDurationMs: number;
};

const requests = new Map<string, RequestMetric>();

export function recordRequest(path: string, statusCode: number, durationMs: number) {
  const key = path.startsWith("/api/trpc/") ? "/api/trpc/:procedure" : path;
  const current = requests.get(key) ?? { count: 0, errors: 0, totalDurationMs: 0 };
  current.count += 1;
  if (statusCode >= 500) current.errors += 1;
  current.totalDurationMs += durationMs;
  requests.set(key, current);
}

export function getMetrics() {
  return Array.from(requests, ([path, metric]) => ({
    path,
    count: metric.count,
    errors: metric.errors,
    averageDurationMs: metric.count
      ? Math.round(metric.totalDurationMs / metric.count)
      : 0,
  }));
}

export function clearMetricsForTests() {
  requests.clear();
}
