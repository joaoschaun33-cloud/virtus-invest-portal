import { CircuitBreaker, withRetry } from "./reliability";
import {
  markEmailDeliveryFailed,
  markEmailDeliverySent,
  reserveEmailDelivery,
} from "./emailDelivery";

type PriceAlertEmail = {
  to: string;
  ticker: string;
  currentPrice: number;
  targetPrice: number;
  condition: "ABOVE" | "BELOW";
  idempotencyKey?: string;
};

const emailCircuit = new CircuitBreaker("resend.email", 3, 60_000);

export async function sendPriceAlertEmail(input: PriceAlertEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || !input.to) return { sent: false as const, reason: "not_configured" as const };
  const idempotencyKey =
    input.idempotencyKey ??
    `virtus:price-alert:${input.ticker}:${input.targetPrice}:${input.condition}:${input.to}`;
  if (!(await reserveEmailDelivery(idempotencyKey))) {
    return { sent: false as const, reason: "already_processed" as const };
  }

  try {
    const response = await withRetry(
      () =>
        emailCircuit.exec(() =>
          fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "Idempotency-Key": idempotencyKey,
            },
            body: JSON.stringify({
              from,
              to: [input.to],
              subject: `Apex Financial · alerta de ${input.ticker}`,
              text: `${input.ticker} atingiu ${input.currentPrice.toFixed(2)} e cruzou o alvo de ${input.targetPrice.toFixed(2)} (${input.condition === "ABOVE" ? "acima" : "abaixo"}). Este é um aviso informativo configurado por você.`,
            }),
            signal: AbortSignal.timeout(8_000),
          })
        ),
      { attempts: 3, baseDelayMs: 500, maxDelayMs: 4_000 }
    );
    if (!response.ok) {
      await markEmailDeliveryFailed(idempotencyKey, `Resend HTTP ${response.status}`);
      return { sent: false as const, reason: "provider_error" as const };
    }
    const responseBody = (await response.json().catch(() => ({}))) as {
      id?: unknown;
    };
    const resendId = typeof responseBody.id === "string" ? responseBody.id : undefined;
    await markEmailDeliverySent(idempotencyKey, resendId);
    return { sent: true as const };
  } catch (error) {
    await markEmailDeliveryFailed(idempotencyKey, error);
    return { sent: false as const, reason: "provider_error" as const };
  }
}
