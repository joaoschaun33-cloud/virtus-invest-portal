import { CircleAlert, Landmark, PieChart, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatPercent,
  formatPrice,
  numberValue,
  optionalNumberValue,
} from "@/lib/formatters";

export default function PortfolioInsight() {
  const performance = trpc.portfolio.performance.useQuery();
  const positions = performance.data?.positions ?? [];
  const pricedPositions = positions.filter(
    position => optionalNumberValue(position.currentValue) !== null
  );
  const hasUnpricedPositions = pricedPositions.length !== positions.length;
  const totalValue = pricedPositions.reduce(
    (total, position) => total + numberValue(position.currentValue),
    0
  );
  const largest = pricedPositions.reduce<
    (typeof positions)[number] | undefined
  >(
    (current, position) =>
      !current ||
      numberValue(position.currentValue) > numberValue(current.currentValue)
        ? position
        : current,
    undefined
  );
  const concentration =
    !hasUnpricedPositions && largest && totalValue
      ? (numberValue(largest.currentValue) / totalValue) * 100
      : null;
  const realized = performance.data?.realizedProfit ?? 0;

  if (performance.isLoading) {
    return (
      <section
        className="mb-6 grid gap-4 lg:grid-cols-3"
        aria-busy="true"
        aria-label="Carregando indicadores da carteira"
      >
        {[0, 1, 2].map(index => (
          <div key={index} className="metric-card">
            <Skeleton className="h-8 w-8 rounded-xl" />
            <Skeleton className="mt-4 h-3 w-24" />
            <Skeleton className="mt-2 h-5 w-32" />
            <Skeleton className="mt-2 h-3 w-40" />
          </div>
        ))}
      </section>
    );
  }

  if (!positions.length) return null;

  return (
    <section className="mb-6 grid gap-4 lg:grid-cols-3">
      <Insight
        icon={<Landmark className="h-4 w-4" />}
        label="Resultado realizado"
        value={formatPrice(realized)}
        note="Compras e vendas já concluídas, incluindo taxas."
        tone={realized >= 0 ? "positive" : "negative"}
      />
      <Insight
        icon={<PieChart className="h-4 w-4" />}
        label="Maior posição"
        value={
          concentration === null
            ? "Indisponível"
            : `${largest?.asset.ticker} · ${formatPercent(concentration, 1)}`
        }
        note={
          concentration === null
            ? "A concentração exige preço atual em todas as posições."
            : "Participação sobre o valor atual da carteira."
        }
        tone={concentration !== null && concentration > 35 ? "caution" : "default"}
      />
      <Insight
        icon={<TrendingUp className="h-4 w-4" />}
        label="Método de apuração"
        value="Custo médio"
        note="Proventos, impostos e eventos corporativos não estão incluídos."
        tone="default"
      />
      {concentration !== null && concentration > 35 && (
        <div className="lg:col-span-3 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs leading-5 text-amber-800 dark:text-amber-200">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>Concentração elevada.</strong> {largest?.asset.ticker}{" "}
            representa {formatPercent(concentration, 1)} do valor atual. Isto é
            um alerta de composição, não uma recomendação de compra ou venda.
          </span>
        </div>
      )}
    </section>
  );
}

function Insight({
  icon,
  label,
  value,
  note,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  tone: "default" | "positive" | "negative" | "caution";
}) {
  const valueClass =
    tone === "positive"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "negative"
        ? "text-rose-700 dark:text-rose-300"
        : tone === "caution"
          ? "text-amber-700 dark:text-amber-300"
          : "text-foreground";
  return (
    <div className="metric-card">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold tracking-tight ${valueClass}`}>
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>
    </div>
  );
}
