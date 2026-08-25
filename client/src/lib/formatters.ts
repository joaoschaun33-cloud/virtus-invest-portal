export function numberValue(value: unknown, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function optionalNumberValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function formatPrice(value: unknown, currency = "BRL") {
  const numeric = optionalNumberValue(value);
  if (numeric === null) return "—";
  const normalizedCurrency = /^[A-Z]{3}$/i.test(currency) ? currency.toUpperCase() : "BRL";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: normalizedCurrency, maximumFractionDigits: numeric < 10 ? 4 : 2 }).format(numeric);
}

export function formatCompact(value: unknown) {
  const numeric = optionalNumberValue(value);
  if (numeric === null) return "—";
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(numeric);
}

export function formatPercent(value: unknown, digits = 2) {
  const numeric = optionalNumberValue(value);
  if (numeric === null) return "—";
  return `${numeric.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

export function formatDate(value: unknown, options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" }) {
  return new Intl.DateTimeFormat("pt-BR", options).format(new Date(String(value)));
}

export function formatRelativeDate(value: unknown) {
  const date = new Date(String(value));
  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 60) return `há ${Math.max(diffMinutes, 1)} min`;
  if (diffMinutes < 1440) return `há ${Math.round(diffMinutes / 60)} h`;
  return `há ${Math.round(diffMinutes / 1440)} d`;
}

export function formatPlainText(value: unknown) {
  let text = String(value ?? "");
  const entities: Record<string, string> = {
    "&lt;": "<",
    "&gt;": ">",
    "&amp;": "&",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
  };
  for (let pass = 0; pass < 2; pass += 1)
    text = text.replace(/&(lt|gt|amp|quot|#39|apos|nbsp);/gi, match =>
      entities[match.toLowerCase()] ?? match
    );
  return text
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}
