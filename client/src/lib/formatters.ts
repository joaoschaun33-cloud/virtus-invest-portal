export function numberValue(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function formatPrice(value: unknown, currency = "BRL") {
  const numeric = numberValue(value);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency, maximumFractionDigits: numeric < 10 ? 4 : 2 }).format(numeric);
}

export function formatCompact(value: unknown) {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(numberValue(value));
}

export function formatPercent(value: unknown, digits = 2) {
  return `${numberValue(value).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
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
