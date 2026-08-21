import { timingSafeEqual } from "node:crypto";

export function matchesJobSecret(
  received: string | undefined,
  expected: string | undefined
) {
  if (!received || !expected) return false;
  const left = Buffer.from(received.trim());
  const right = Buffer.from(expected.trim());
  return left.length === right.length && timingSafeEqual(left, right);
}
