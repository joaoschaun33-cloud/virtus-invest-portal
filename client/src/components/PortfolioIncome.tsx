import { Coins, Info } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDate, formatPrice } from "@/lib/formatters";

export default function PortfolioIncome() {
  const incomeQuery = trpc.portfolio.dividendIncome.useQuery();
  const events = incomeQuery.data ?? [];
  const total = events.reduce(
    (sum, item) => sum + item.estimatedGrossIncome,
    0
  );

  if (incomeQuery.isLoading || !events.length) return null;

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-border/60 bg-card/50">
      <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <Coins className="h-4 w-4" />
          </div>
          <div>
            <h2 className="section-heading">Proventos identificados</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Estimativa bruta pelo saldo manual registrado na data do evento.
            </p>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[10px] uppercase tracking-[.12em] text-muted-foreground">
            Total identificado
          </p>
          <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            {formatPrice(total)}
          </p>
        </div>
      </div>
      <div className="divide-y divide-border/60">
        {events.slice(0, 5).map(item => (
          <div
            key={item.dividend.id}
            className="flex items-center justify-between gap-4 px-5 py-3"
          >
            <div>
              <p className="text-sm font-semibold">
                {item.asset.ticker} · {item.dividend.kind}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatDate(item.dividend.eventDate, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}{" "}
                · {item.quantityAtEvent.toLocaleString("pt-BR")} un. ·{" "}
                {item.dividend.sourceName}
              </p>
            </div>
            <p className="text-sm font-semibold">
              {formatPrice(item.estimatedGrossIncome, item.asset.currency)}
            </p>
          </div>
        ))}
      </div>
      <div className="flex items-start gap-2 bg-muted/35 px-5 py-3 text-[11px] leading-5 text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <p>
          Valores são informativos: não confirmam data-com, liquidação,
          retenções, impostos, amortizações ou eventos corporativos.
        </p>
      </div>
    </section>
  );
}
