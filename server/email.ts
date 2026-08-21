type PriceAlertEmail = {
  to: string;
  ticker: string;
  currentPrice: number;
  targetPrice: number;
  condition: "ABOVE" | "BELOW";
};

export async function sendPriceAlertEmail(input: PriceAlertEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || !input.to) return { sent: false as const, reason: "not_configured" as const };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: `Apex Financial · alerta de ${input.ticker}`,
      text: `${input.ticker} atingiu ${input.currentPrice.toFixed(2)} e cruzou o alvo de ${input.targetPrice.toFixed(2)} (${input.condition === "ABOVE" ? "acima" : "abaixo"}). Este é um aviso informativo configurado por você.`,
    }),
  });

  return response.ok ? { sent: true as const } : { sent: false as const, reason: "provider_error" as const };
}
