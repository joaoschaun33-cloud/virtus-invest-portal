import type { MarketDataFreshness, MarketDataSource } from "@shared/marketData";
import { formatDate } from "@/lib/formatters";

const freshnessLabels: Record<MarketDataFreshness, string> = {
  live: "Tempo real",
  delayed: "Com atraso",
  close: "Fechamento",
  demo: "Demonstração",
  stale: "Desatualizado",
  unavailable: "Indisponível",
  official: "Oficial",
};
const sourceLabels: Record<MarketDataSource, string> = {
  brapi: "brapi",
  "twelve-data": "Twelve Data",
  finnhub: "Finnhub",
  coingecko: "CoinGecko",
  eodhd: "EODHD",
  catalog: "sem fonte disponível",
  "tesouro-direto": "Tesouro Nacional",
  b3: "B3",
  cvm: "CVM",
  bcb: "Banco Central do Brasil",
  ibge: "IBGE",
};

export function DataProvenance({
  source,
  asOf,
  freshness,
  compact = false,
}: {
  source: MarketDataSource;
  asOf: string | Date;
  freshness: MarketDataFreshness;
  compact?: boolean;
}) {
  const date = new Date(asOf);
  const validDate = !Number.isNaN(date.valueOf()) && date.valueOf() > 0;
  return (
    <div
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground ${compact ? "text-[10px]" : "text-xs"}`}
    >
      <span
        className={`rounded-full px-2 py-0.5 font-semibold ${
          freshness === "demo"
            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
            : freshness === "official"
              ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        }`}
      >
        {freshnessLabels[freshness] ?? freshness}
      </span>
      <span>Fonte: {sourceLabels[source] ?? source}</span>
      {validDate && (
        <span>
          · referência:{" "}
          {formatDate(date, {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      )}
    </div>
  );
}
