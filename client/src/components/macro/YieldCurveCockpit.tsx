import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Activity,
  Flame,
  Scale,
  ShieldCheck,
  Info,
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatPercent, formatPrice } from "@/lib/formatters";
import { DataProvenance } from "@/components/DataProvenance";
import { Panel } from "@/components/apex/ApexPrimitives";
import { cn } from "@/lib/utils";

export function YieldCurveCockpit() {
  const [viewMode, setViewMode] = useState<"executive" | "analyst">("executive");
  const yieldQuery = trpc.market.yieldCurve.useQuery(undefined, {
    staleTime: 5 * 60_000,
  });

  const curveData = yieldQuery.data;

  if (yieldQuery.isLoading) {
    return (
      <Panel className="p-6">
        <div className="flex animate-pulse flex-col gap-4">
          <div className="h-6 w-48 rounded bg-muted/60" />
          <div className="h-4 w-96 rounded bg-muted/40" />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="h-28 rounded-xl bg-muted/30" />
            <div className="h-28 rounded-xl bg-muted/30" />
            <div className="h-28 rounded-xl bg-muted/30" />
          </div>
          <div className="h-72 rounded-xl bg-muted/20" />
        </div>
      </Panel>
    );
  }

  if (!curveData || !curveData.pointsPrefixado.length) {
    return (
      <Panel className="p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Dados da curva soberana temporariamente indisponíveis no Tesouro Direto.
        </p>
      </Panel>
    );
  }

  // Montar dados para o gráfico comparativo
  const allYears = Array.from(
    new Set([
      ...curveData.pointsPrefixado.map(p => p.maturityYear),
      ...curveData.pointsIpca.map(p => p.maturityYear),
    ])
  ).sort((a, b) => a - b);

  const chartSeries = allYears.map(year => {
    const pref = curveData.pointsPrefixado.find(p => p.maturityYear === year);
    const ipca = curveData.pointsIpca.find(p => p.maturityYear === year);
    return {
      year: `${year}`,
      Prefixado: pref ? pref.rate : null,
      "IPCA+ (Real)": ipca ? ipca.rate : null,
      Selic: curveData.selicRate,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header com Seletor de Camada de Leitura (Two-Tier Reading) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              Cockpit Macro & Curva de Juros Soberana
            </h2>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              ETTJ Oficial
            </span>
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Estrutura a termo das taxas de juros (Tesouro Nacional e Banco Central do Brasil).
          </p>
        </div>

        {/* Toggle Modo Executivo vs Modo Analista */}
        <div className="inline-flex rounded-xl border border-border/70 bg-card/60 p-1 backdrop-blur">
          <button
            type="button"
            onClick={() => setViewMode("executive")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
              viewMode === "executive"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Visão Executiva</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("analyst")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
              viewMode === "analyst"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Visão Analista (Pro)</span>
          </button>
        </div>
      </div>

      {/* Cards de Inteligência Macro Institucional */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* 1. Inclinação da Curva */}
        <Panel className="p-4 transition hover:border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Inclinação da Curva (Slope)
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                curveData.slope?.structure === "INCLINADA"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : curveData.slope?.structure === "INVERTIDA"
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                  : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
              )}
            >
              {curveData.slope?.structure ?? "Normal"}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">
              {curveData.slope
                ? `${curveData.slope.spreadBps > 0 ? "+" : ""}${curveData.slope.spreadBps} bps`
                : "—"}
            </span>
            <span className="text-xs text-muted-foreground">
              {curveData.slope?.longLabel} vs {curveData.slope?.shortLabel}
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-2">
            {curveData.slope?.interpretation}
          </p>
        </Panel>

        {/* 2. Inflação Implícita (Breakeven) */}
        <Panel className="p-4 transition hover:border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Inflação Implícita (Breakeven)
            </span>
            <Flame className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {curveData.breakeven
                ? formatPercent(curveData.breakeven.impliedInflation)
                : "—"}
            </span>
            <span className="text-xs text-muted-foreground">
              Horizonte {curveData.breakeven?.referenceYear}
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-2">
            {curveData.breakeven?.interpretation}
          </p>
        </Panel>

        {/* 3. Equity Risk Premium (Bolsa vs NTN-B) */}
        <Panel className="p-4 transition hover:border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Equity Risk Premium (ERP)
            </span>
            <Scale className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              {curveData.erp
                ? `${curveData.erp.spreadPercent > 0 ? "+" : ""}${formatPercent(curveData.erp.spreadPercent)}`
                : "—"}
            </span>
            <span className="text-xs text-muted-foreground">
              Excedente s/ NTN-B
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-2">
            {curveData.erp?.interpretation}
          </p>
        </Panel>
      </div>

      {/* Gráfico da Estrutura a Termo das Taxas (ETTJ) */}
      <Panel className="p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-tight">
              Curva Soberana de Rendimento (Prefixado & IPCA+)
            </h3>
            <p className="text-xs text-muted-foreground">
              Taxas nominais de títulos prefixados e juros reais de títulos atrelados ao IPCA ao longo dos anos de vencimento.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-[#f93943]" /> Prefixado
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> IPCA+ (Real)
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
              <span className="h-1 w-3 border-b-2 border-dashed border-sky-500" /> Selic Meta
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-2 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartSeries}
              margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-border/40"
              />
              <XAxis
                dataKey="year"
                stroke="currentColor"
                className="text-xs text-muted-foreground"
                tickLine={false}
              />
              <YAxis
                stroke="currentColor"
                className="text-xs text-muted-foreground"
                tickLine={false}
                domain={["auto", "auto"]}
                tickFormatter={value => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(var(--card))",
                  borderColor: "oklch(var(--border))",
                  borderRadius: "0.75rem",
                  fontSize: "12px",
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2)",
                }}
                formatter={(val: unknown) => [
                  typeof val === "number" ? `${val.toFixed(2)}% a.a.` : "—",
                ]}
              />
              <ReferenceLine
                y={curveData.selicRate}
                stroke="#0ea5e9"
                strokeDasharray="4 4"
                label={{
                  value: `Selic ${curveData.selicRate.toFixed(2)}%`,
                  position: "insideTopRight",
                  fill: "#0ea5e9",
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="Prefixado"
                stroke="#f93943"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#f93943" }}
                activeDot={{ r: 6 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="IPCA+ (Real)"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#10b981" }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* Camada Detalhada: Visão Analista (Tabela de Vértices e Análise Fatorial) */}
      {viewMode === "analyst" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Vértices Prefixados */}
          <Panel className="p-5">
            <h4 className="text-sm font-semibold tracking-tight text-foreground">
              Vértices Nominais (Tesouro Prefixado)
            </h4>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground">
                    <th className="pb-2 font-medium">Vencimento</th>
                    <th className="pb-2 font-medium">Taxa Anual</th>
                    <th className="pb-2 font-medium">Preço Unitário</th>
                    <th className="pb-2 font-medium text-right">Spread vs Selic</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {curveData.pointsPrefixado.map(point => {
                    const spread = point.rate - curveData.selicRate;
                    return (
                      <tr key={point.bondName} className="hover:bg-muted/20">
                        <td className="py-2.5 font-medium">{point.maturityDate}</td>
                        <td className="py-2.5 font-bold text-primary">
                          {point.rate.toFixed(2)}%
                        </td>
                        <td className="py-2.5">{formatPrice(point.unitPrice)}</td>
                        <td
                          className={cn(
                            "py-2.5 text-right font-medium",
                            spread >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          )}
                        >
                          {spread >= 0 ? "+" : ""}
                          {(spread * 100).toFixed(0)} bps
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Vértices Reais (Tesouro IPCA+) */}
          <Panel className="p-5">
            <h4 className="text-sm font-semibold tracking-tight text-foreground">
              Vértices Reais (Tesouro IPCA+)
            </h4>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground">
                    <th className="pb-2 font-medium">Vencimento</th>
                    <th className="pb-2 font-medium">Juro Real</th>
                    <th className="pb-2 font-medium">Preço Unitário</th>
                    <th className="pb-2 font-medium text-right">Inflação Breakeven</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {curveData.pointsIpca.map(point => (
                    <tr key={point.bondName} className="hover:bg-muted/20">
                      <td className="py-2.5 font-medium">{point.maturityDate}</td>
                      <td className="py-2.5 font-bold text-emerald-600 dark:text-emerald-400">
                        IPCA + {point.rate.toFixed(2)}%
                      </td>
                      <td className="py-2.5">{formatPrice(point.unitPrice)}</td>
                      <td className="py-2.5 text-right font-medium text-muted-foreground">
                        {curveData.breakeven?.referenceYear === point.maturityYear
                          ? `${curveData.breakeven.impliedInflation.toFixed(2)}% a.a.`
                          : "Referencial"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      ) : (
        /* Visão Executiva: Guia Rápido do Ciclo Macroeconômico */
        <Panel className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Info className="h-4 w-4 text-primary" />
            <span>Como ler a curva de juros no momento atual:</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs text-muted-foreground leading-relaxed">
            <div className="rounded-xl border border-border/50 bg-card/40 p-3.5">
              <p className="font-semibold text-foreground">1. O que sinaliza o Slope</p>
              <p className="mt-1">
                Quando a inclinação é positiva, títulos longos pagam mais que os curtos para remunerar a incerteza futura. Se a curva inverter, sinaliza aperto monetário no curto prazo.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/40 p-3.5">
              <p className="font-semibold text-foreground">2. Inflação Implícita</p>
              <p className="mt-1">
                Calculada pela equação de Fisher entre títulos Prefixados e NTN-B. Mostra a inflação média anual que o mercado financeiro está projetando para os próximos anos.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/40 p-3.5">
              <p className="font-semibold text-foreground">3. Prêmio de Risco da Bolsa</p>
              <p className="mt-1">
                Com juros reais do Tesouro IPCA+ elevados, ações só se tornam atrativas se entregarem lucros operacionais e dividendos com folga sobre a renda fixa pública.
              </p>
            </div>
          </div>
        </Panel>
      )}

      {/* Bloco de Procedência Oficial dos Dados (Data Provenance First) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>
            Fontes primárias auditadas: <strong>Tesouro Nacional</strong> (Tesouro Transparente) e <strong>Banco Central do Brasil</strong> (API SGS).
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DataProvenance
            source="tesouro-direto"
            asOf={curveData.asOf}
            freshness="official"
            compact
          />
        </div>
      </div>
    </div>
  );
}
