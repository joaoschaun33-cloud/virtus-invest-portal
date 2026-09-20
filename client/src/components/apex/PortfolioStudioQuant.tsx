import { useMemo, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Flame,
  Scale,
  Sparkles,
  Info,
  TrendingDown,
  Layers,
  ArrowRight,
  PieChart,
  Sliders,
} from "lucide-react";
import { Panel } from "@/components/apex/ApexPrimitives";
import { formatPercent, formatPrice, numberValue } from "@/lib/formatters";
import {
  calculatePortfolioRisk,
  simulateStressScenarios,
  type QuantPosition,
} from "@/lib/portfolioQuant";
import { cn } from "@/lib/utils";

type PortfolioStudioQuantProps = {
  positions: Array<{
    asset: {
      ticker: string;
      assetType?: string;
    };
    currentValue?: number | string | null;
  }>;
};

export function PortfolioStudioQuant({ positions }: PortfolioStudioQuantProps) {
  const [activeTab, setActiveTab] = useState<"var" | "stress" | "concentration">(
    "var"
  );
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("covid-19");

  // Converter posições para o formato do motor quant
  const quantPositions: QuantPosition[] = useMemo(() => {
    return positions
      .map(p => ({
        ticker: p.asset.ticker,
        assetType: p.asset.assetType ?? "STOCK",
        currentValue: numberValue(p.currentValue),
      }))
      .filter(p => p.currentValue > 0);
  }, [positions]);

  const riskMetrics = useMemo(() => {
    return calculatePortfolioRisk(quantPositions);
  }, [quantPositions]);

  const stressScenarios = useMemo(() => {
    return simulateStressScenarios(quantPositions);
  }, [quantPositions]);

  const selectedScenario = useMemo(() => {
    return (
      stressScenarios.find(s => s.id === selectedScenarioId) ??
      stressScenarios[0]
    );
  }, [stressScenarios, selectedScenarioId]);

  if (!riskMetrics || riskMetrics.totalValue <= 0) {
    return null;
  }

  return (
    <Panel className="overflow-hidden p-5 sm:p-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Activity className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-bold tracking-tight sm:text-xl">
              Portfolio Studio Quant & Gestão de Risco
            </h2>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                riskMetrics.riskProfile === "CONSERVADOR"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : riskMetrics.riskProfile === "ARROJADO"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
              )}
            >
              Perfil {riskMetrics.riskProfile}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Value at Risk (VaR), cauda de risco e simulação de testes de estresse históricos.
          </p>
        </div>

        {/* Seletor de Módulos */}
        <div className="inline-flex rounded-xl border border-border/70 bg-card/60 p-1 backdrop-blur">
          <button
            type="button"
            onClick={() => setActiveTab("var")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
              activeTab === "var"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Métricas de VaR</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("stress")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
              activeTab === "stress"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>Testes de Estresse</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("concentration")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
              activeTab === "concentration"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <PieChart className="h-3.5 w-3.5" />
            <span>Diversificação</span>
          </button>
        </div>
      </div>

      {/* Conteúdo Aba 1: Métricas de Risco & VaR */}
      {activeTab === "var" && (
        <div className="mt-5 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: VaR Diário 95% */}
            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <span className="text-xs font-medium text-muted-foreground">
                VaR 1 Dia (95% Confiança)
              </span>
              <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                {formatPrice(riskMetrics.var95DailyAmount, "BRL")}
              </p>
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-semibold">
                -{riskMetrics.var95DailyPercent}% do patrimônio
              </p>
              <p className="mt-2 text-[10px] text-muted-foreground leading-normal">
                Em 95 de cada 100 dias úteis, a perda diária não deve exceder este montante.
              </p>
            </div>

            {/* Card 2: VaR Mensal 99% (Cenário Extremo) */}
            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <span className="text-xs font-medium text-muted-foreground">
                VaR 21 Dias (99% Confiança)
              </span>
              <p className="mt-2 text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                {formatPrice(riskMetrics.var99MonthlyAmount, "BRL")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                -{riskMetrics.var99MonthlyPercent}% horizonte mensal
              </p>
              <p className="mt-2 text-[10px] text-muted-foreground leading-normal">
                Perda máxima esperada em 99% dos meses sob condições normais de volatilidade.
              </p>
            </div>

            {/* Card 3: Volatilidade Anualizada */}
            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <span className="text-xs font-medium text-muted-foreground">
                Volatilidade Anualizada (σ)
              </span>
              <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                {riskMetrics.annualVolatilityPercent.toFixed(1)}% a.a.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Diária: {riskMetrics.dailyVolatilityPercent.toFixed(2)}%
              </p>
              <p className="mt-2 text-[10px] text-muted-foreground leading-normal">
                Desvio-padrão ponderado dos ativos da carteira ajustado por correlação cruzada.
              </p>
            </div>

            {/* Card 4: Sharpe Ratio & CVaR */}
            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <span className="text-xs font-medium text-muted-foreground">
                Índice de Sharpe Referencial
              </span>
              <p className="mt-2 text-2xl font-bold tracking-tight text-primary">
                {riskMetrics.sharpeRatio.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Benchmark: Selic 10,5%
              </p>
              <p className="mt-2 text-[10px] text-muted-foreground leading-normal">
                Retorno excedente por unidade de risco assumido.
              </p>
            </div>
          </div>

          {/* Banner Educativo de Expected Shortfall (CVaR) */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-xs text-muted-foreground leading-relaxed">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <Info className="h-4 w-4 text-primary" />
              <span>Entendendo o Risco de Cauda (Expected Shortfall / CVaR):</span>
            </div>
            <p className="mt-1">
              Caso ocorra um evento raro nos 5% piores dias do mercado (ultrapassando o VaR 95%), a perda média estimada para a carteira é de <strong>{formatPrice(riskMetrics.cvar95DailyAmount, "BRL")} (-{riskMetrics.cvar95DailyPercent.toFixed(2)}%)</strong> em um único dia. O CVaR mede a severidade da perda quando o pior acontece.
            </p>
          </div>
        </div>
      )}

      {/* Conteúdo Aba 2: Simulador de Testes de Estresse */}
      {activeTab === "stress" && (
        <div className="mt-5 space-y-6">
          {/* Seletor de Cenários de Crise */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stressScenarios.map(scenario => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => setSelectedScenarioId(scenario.id)}
                className={cn(
                  "flex flex-col text-left rounded-xl border p-3.5 transition",
                  selectedScenarioId === scenario.id
                    ? "border-primary bg-primary/5 shadow-xs"
                    : "border-border/60 bg-card/40 hover:bg-card/80"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {scenario.period}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.2 text-[9px] font-bold uppercase",
                      scenario.severity === "EXTREMA"
                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {scenario.severity}
                  </span>
                </div>
                <p className="mt-1.5 text-xs font-bold text-foreground line-clamp-1">
                  {scenario.name}
                </p>
                <p className="mt-2 text-sm font-bold text-rose-600 dark:text-rose-400">
                  -{scenario.estimatedLossPercent}%
                </p>
                <p className="text-[10px] text-muted-foreground">
                  -{formatPrice(scenario.estimatedLossAmount, "BRL")}
                </p>
              </button>
            ))}
          </div>

          {/* Painel Detalhado do Cenário Selecionado */}
          {selectedScenario && (
            <div className="rounded-xl border border-border/60 bg-card/50 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between border-b border-border/60 pb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {selectedScenario.name} ({selectedScenario.period})
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedScenario.description}
                  </p>
                </div>
                <div className="flex items-baseline gap-2 sm:text-right">
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Patrimônio Resultante:
                    </span>
                    <p className="text-xl font-bold text-foreground">
                      {formatPrice(selectedScenario.estimatedRemainingValue, "BRL")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabela de Impacto por Posição/Classe */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground">
                      <th className="pb-2 font-medium">Classe do Ativo</th>
                      <th className="pb-2 font-medium">Valor na Carteira</th>
                      <th className="pb-2 font-medium">Choque Histórico</th>
                      <th className="pb-2 font-medium text-right">Perda Estimada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {selectedScenario.breakdown.map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="py-2.5 font-semibold text-foreground">
                          {item.assetType}
                        </td>
                        <td className="py-2.5">{formatPrice(item.value, "BRL")}</td>
                        <td
                          className={cn(
                            "py-2.5 font-bold",
                            item.shockPercent < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {item.shockPercent > 0 ? "+" : ""}
                          {item.shockPercent.toFixed(1)}%
                        </td>
                        <td className="py-2.5 text-right font-medium text-rose-600 dark:text-rose-400">
                          {formatPrice(item.impactAmount, "BRL")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conteúdo Aba 3: Diversificação & Concentração */}
      {activeTab === "concentration" && (
        <div className="mt-5 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-card/40 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">
                Score de Diversificação da Carteira
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Calculado pelo inverso do Índice Herfindahl-Hirschman (HHI). Pontuações mais altas indicam risco distribuído eficientemente entre múltiplos ativos e classes.
              </p>

              <div className="flex items-baseline gap-3 pt-2">
                <span className="text-4xl font-bold tracking-tight text-primary">
                  {riskMetrics.diversificationScore}
                </span>
                <span className="text-xs text-muted-foreground">de 100 pontos</span>
              </div>

              {/* Barra de Progresso do Score */}
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${riskMetrics.diversificationScore}%` }}
                />
              </div>

              <div className="pt-2 text-xs text-muted-foreground">
                {riskMetrics.diversificationScore >= 70 ? (
                  <p className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <ShieldCheck className="h-4 w-4" />
                    Excelente diversificação: nenhum ativo concentra risco excessivo.
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <Info className="h-4 w-4" />
                    Atenção à concentração: poucos ativos dominam o valor total da carteira.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Diretrizes de Gestão de Risco Institucional
              </h3>
              <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span>
                    <strong>Limite por Ticker:</strong> Evite que uma única ação supere 15% a 20% do patrimônio total para limitar risco idiossincrático.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span>
                    <strong>Descorrelação Real:</strong> Renda fixa pública (Tesouro Selic/IPCA+) e ativos dolarizados historicamente amortecem choques de cauda como o de 2020.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span>
                    <strong>Horizonte Temporal:</strong> O VaR de 21 dias sinaliza que perdas mensais temporárias fazem parte da volatilidade natural de renda variável.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Footer de Compliance */}
      <div className="mt-5 border-t border-border/50 pt-3 text-[10px] leading-4 text-muted-foreground">
        <strong>Aviso Institucional:</strong> Os cálculos de Value at Risk (VaR), volatilidade e testes de estresse são modelos matemáticos baseados em distribuições estatísticas e séries históricas reais. Não constituem promessa de rentabilidade, seguro contra perdas ou consultoria individual de investimentos.
      </div>
    </Panel>
  );
}
