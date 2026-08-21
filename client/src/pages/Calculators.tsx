import { useId, useMemo, useState } from "react";
import {
  Calculator as CalculatorIcon,
  Coins,
  LineChart as LineChartIcon,
  Percent,
  RotateCcw,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { AppTopBar, PageHeader, Panel } from "@/components/apex/ApexPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { formatDate, formatPrice, numberValue } from "@/lib/formatters";

export default function Calculators() {
  const [initial, setInitial] = useState("10000");
  const [monthly, setMonthly] = useState("1000");
  const [rate, setRate] = useState("10");
  const [years, setYears] = useState("10");
  const compoundError =
    [initial, monthly, rate, years].some(value => value.trim() === "") ||
    ![initial, monthly, rate, years].every(value =>
      Number.isFinite(Number(value))
    ) ||
    Number(initial) < 0 ||
    Number(monthly) < 0 ||
    Number(rate) <= -100 ||
    Number(years) < 1 ||
    !Number.isInteger(Number(years));
  const compoundInput = useMemo(
    () => ({
      initial: Number(initial) || 0,
      monthly: Number(monthly) || 0,
      annualRate: Number(rate) || 0,
      years: Math.max(1, Math.trunc(Number(years) || 1)),
    }),
    [initial, monthly, rate, years]
  );
  const compound = trpc.portfolio.compoundInterest.useQuery(compoundInput, {
    enabled: !compoundError,
  });
  const [dividendTickerDraft, setDividendTickerDraft] = useState("PETR4");
  const [dividendTicker, setDividendTicker] = useState("PETR4");
  const dividends = trpc.portfolio.dividendHistory.useQuery({
    ticker: dividendTicker,
  });
  const last = compound.data?.at(-1);
  const chartData = compound.data ?? [];
  const maxBalance = Math.max(...chartData.map(point => point.balance), 1);
  const chartPath = chartData
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${12 + (index / Math.max(1, chartData.length - 1)) * 656},${250 - (point.balance / maxBalance) * 210}`
    )
    .join(" ");

  const reset = () => {
    setInitial("10000");
    setMonthly("1000");
    setRate("10");
    setYears("10");
  };

  return (
    <DashboardLayout allowAnonymous>
      <AppTopBar title="Calculadoras" />
      <div className="container pb-12">
        <PageHeader
          eyebrow="Ferramentas analíticas"
          title="Transforme hipóteses em cenários."
          description="Simule trajetórias matemáticas e organize históricos passados. Os resultados não projetam retornos futuros nem substituem sua análise."
          actions={
            <Button variant="outline" className="rounded-xl" onClick={reset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restaurar exemplo
            </Button>
          }
        />
        <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
          <Panel className="overflow-hidden">
            <div className="flex items-center gap-3 border-b border-border/60 px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CalculatorIcon className="h-4 w-4" />
              </div>
              <div>
                <h2 className="section-heading">Juros compostos</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Aportes regulares e capitalização anual equivalente.
                </p>
              </div>
            </div>
            <div className="grid gap-5 p-5 md:grid-cols-[220px_minmax(0,1fr)]">
              <div className="space-y-4">
                <CalcInput
                  label="Aporte inicial"
                  value={initial}
                  onChange={setInitial}
                  prefix="R$"
                />
                <CalcInput
                  label="Aporte mensal"
                  value={monthly}
                  onChange={setMonthly}
                  prefix="R$"
                />
                <CalcInput
                  label="Taxa anual"
                  value={rate}
                  onChange={setRate}
                  suffix="%"
                />
                <CalcInput
                  label="Prazo"
                  value={years}
                  onChange={setYears}
                  suffix="anos"
                />
                <div className="rounded-xl bg-primary/[0.07] p-3 text-[11px] leading-5 text-muted-foreground">
                  <Percent className="mb-2 h-4 w-4 text-primary" />
                  <p>
                    Use a taxa apenas como hipótese matemática. O simulador não
                    representa uma promessa de rentabilidade.
                  </p>
                </div>
              </div>
              <div>
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-background/55 p-3">
                    <p className="text-[11px] text-muted-foreground">
                      Patrimônio final
                    </p>
                    <p className="mt-2 text-xl font-semibold">
                      {formatPrice(last?.balance ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-background/55 p-3">
                    <p className="text-[11px] text-muted-foreground">
                      Juros acumulados
                    </p>
                    <p className="mt-2 text-xl font-semibold text-emerald-600 dark:text-emerald-300">
                      {formatPrice(last?.interest ?? 0)}
                    </p>
                  </div>
                </div>
                {compoundError && (
                  <p className="mb-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-3 text-xs leading-5 text-rose-700 dark:text-rose-300">
                    Use números válidos: aportes não negativos, taxa maior que
                    -100% e prazo inteiro de pelo menos 1 ano.
                  </p>
                )}
                <div className="rounded-xl border border-border/60 bg-background/35 p-3">
                  <svg
                    viewBox="0 0 680 280"
                    className="h-auto w-full"
                    role="img"
                    aria-label="Evolução do patrimônio na simulação"
                  >
                    <defs>
                      <linearGradient
                        id="compoundArea"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="var(--primary)"
                          stopOpacity=".24"
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--primary)"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    {[0, 1, 2, 3].map(row => (
                      <line
                        key={row}
                        x1="12"
                        x2="668"
                        y1={20 + row * 60}
                        y2={20 + row * 60}
                        stroke="currentColor"
                        strokeOpacity=".08"
                        strokeDasharray="3 5"
                      />
                    ))}
                    {chartPath && (
                      <>
                        <path
                          d={`${chartPath} L668,250 L12,250 Z`}
                          fill="url(#compoundArea)"
                        />
                        <path
                          d={chartPath}
                          fill="none"
                          stroke="var(--primary)"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </>
                    )}
                  </svg>
                  <div className="flex items-center justify-between px-1 text-[10px] text-muted-foreground">
                    <span>mês 0</span>
                    <span>{compoundInput.years} anos</span>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
          <Panel className="overflow-hidden">
            <div className="flex items-center gap-3 border-b border-border/60 px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                <Coins className="h-4 w-4" />
              </div>
              <div>
                <h2 className="section-heading">Histórico de dividendos</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Eventos passados por ativo do catálogo.
                </p>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2">
                <Input
                  aria-label="Ticker para consultar dividendos"
                  value={dividendTickerDraft}
                  onChange={event =>
                    setDividendTickerDraft(event.target.value.toUpperCase())
                  }
                  onKeyDown={event => {
                    if (event.key === "Enter")
                      setDividendTicker(
                        dividendTickerDraft.trim().toUpperCase()
                      );
                  }}
                  className="h-10 rounded-xl"
                  placeholder="Ticker"
                />
                <Button
                  className="h-10 rounded-xl"
                  onClick={() =>
                    setDividendTicker(dividendTickerDraft.trim().toUpperCase())
                  }
                  disabled={!dividendTickerDraft.trim() || dividends.isFetching}
                >
                  {dividends.isFetching ? "Consultando…" : "Consultar"}
                </Button>
              </div>
              <div className="mt-5 space-y-3">
                {dividends.isError && (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-6 text-center text-xs text-rose-700 dark:text-rose-300">
                    Não foi possível consultar esse histórico agora.
                  </div>
                )}
                {(dividends.data ?? []).map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl bg-background/55 p-3"
                  >
                    <div>
                      <p className="text-xs font-semibold">
                        {formatDate(item.eventDate, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {item.kind} · {item.sourceName}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                      {formatPrice(item.amountPerShare)}
                    </p>
                  </div>
                ))}
                {!dividends.data?.length && (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    Nenhum evento encontrado para {dividendTicker}.
                  </div>
                )}
              </div>
              <div className="mt-5 flex items-center gap-2 text-[11px] leading-5 text-muted-foreground">
                <LineChartIcon className="h-3.5 w-3.5 text-primary" />
                Histórico passado não indica distribuição futura.
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </DashboardLayout>
  );
}
function CalcInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
}) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <div className="relative mt-2">
        <Input
          id={id}
          aria-label={label}
          inputMode="decimal"
          value={value}
          onChange={event => onChange(event.target.value.replace(",", "."))}
          className={`h-10 rounded-xl bg-background/60 ${prefix ? "pl-9" : ""} ${suffix ? "pr-14" : ""}`}
        />
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {prefix}
          </span>
        )}
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
