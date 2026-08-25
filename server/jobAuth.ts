import { timingSafeEqual } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import type { Request } from "express";

const oidcClient = new OAuth2Client();

export function matchesJobSecret(
  received: string | undefined,
  expected: string | undefined
) {
  if (!received || !expected) return false;
  const left = Buffer.from(received.trim());
  const right = Buffer.from(expected.trim());
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function authorizeJobRequest(request: Request) {
  const token = request.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (matchesJobSecret(token, process.env.CRON_SECRET)) return true;
  if (!token) return false;
  const audience =
    process.env.JOB_OIDC_AUDIENCE ??
    "https://virtus-web-ysuazn5yga-rj.a.run.app";
  const allowedServiceAccount =
    process.env.JOB_SCHEDULER_SERVICE_ACCOUNT ??
    "virtus-runtime@portal-virtus.iam.gserviceaccount.com";
  try {
    const ticket = await oidcClient.verifyIdToken({ idToken: token, audience });
    const payload = ticket.getPayload();
    return Boolean(
      payload?.email_verified && payload.email === allowedServiceAccount
    );
  } catch {
    return false;
  }
}
