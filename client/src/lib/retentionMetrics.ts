export type RetentionBucket = "D0" | "D1" | "D2-D6" | "D7-D29" | "D30+";

const FIRST_SEEN_KEY = "virtus-analytics-first-seen-v1";
const SESSION_RECORDED_KEY = "virtus-beta-session-recorded-v1";

export function retentionBucket(firstSeen: Date, now: Date): RetentionBucket {
  const elapsedDays = Math.max(0, Math.floor((now.valueOf() - firstSeen.valueOf()) / 86_400_000));
  if (elapsedDays === 0) return "D0";
  if (elapsedDays === 1) return "D1";
  if (elapsedDays < 7) return "D2-D6";
  if (elapsedDays < 30) return "D7-D29";
  return "D30+";
}

export function recordConsentedBetaSession(now = new Date()) {
  if (!window.gtag || sessionStorage.getItem(SESSION_RECORDED_KEY)) return false;
  const stored = localStorage.getItem(FIRST_SEEN_KEY);
  const parsed = stored ? new Date(stored) : now;
  const firstSeen = Number.isNaN(parsed.valueOf()) || parsed > now ? now : parsed;
  if (!stored || firstSeen === now) localStorage.setItem(FIRST_SEEN_KEY, now.toISOString());
  window.gtag("event", "beta_session", { retention_bucket: retentionBucket(firstSeen, now) });
  sessionStorage.setItem(SESSION_RECORDED_KEY, "1");
  return true;
}
