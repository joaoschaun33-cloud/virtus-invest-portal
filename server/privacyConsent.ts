export type ConsentChoice = "necessary" | "analytics";

export function shouldAppendConsentRecord(
  latest: { value: ConsentChoice; policyVersion: string } | undefined,
  next: { value: ConsentChoice; policyVersion: string }
) {
  return !latest || latest.value !== next.value || latest.policyVersion !== next.policyVersion;
}
