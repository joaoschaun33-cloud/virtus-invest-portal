export function metricNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function matchesMinimum(value: unknown, minimum?: number) {
  if (minimum === undefined) return true;
  const numeric = metricNumber(value);
  return numeric !== null && numeric >= minimum;
}

export function matchesMaximum(value: unknown, maximum?: number) {
  if (maximum === undefined) return true;
  const numeric = metricNumber(value);
  return numeric !== null && numeric <= maximum;
}

export function compareNullableMetrics(
  left: unknown,
  right: unknown,
  direction: "asc" | "desc"
) {
  const a = metricNumber(left);
  const b = metricNumber(right);
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === "asc" ? a - b : b - a;
}
