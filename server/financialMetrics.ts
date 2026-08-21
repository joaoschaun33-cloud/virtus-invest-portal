import type { CvmFinancialStatements } from "./cvmFinancialData";

export type FinancialMetric = {
  id:
    | "net-margin"
    | "equity-ratio"
    | "annualized-roe"
    | "revenue-growth"
    | "net-income-change";
  label: string;
  value: number;
  unit: "%";
  formula: string;
  interpretation: string;
  limitation: string | null;
  source: "virtus";
};

function safePercent(numerator: number | null, denominator: number | null) {
  if (numerator === null || denominator === null || denominator === 0) return null;
  const value = (numerator / denominator) * 100;
  return Number.isFinite(value) ? value : null;
}

function growthPercent(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return null;
  const value = ((current - previous) / Math.abs(previous)) * 100;
  return Number.isFinite(value) ? value : null;
}

function periodDays(start: string, end: string) {
  const startTime = Date.parse(`${start}T00:00:00Z`);
  const endTime = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime)
    return null;
  return Math.floor((endTime - startTime) / 86_400_000) + 1;
}

export function deriveFinancialMetrics(
  statement: CvmFinancialStatements
): FinancialMetric[] {
  const metrics: FinancialMetric[] = [];
  const margin = safePercent(statement.values.netIncome, statement.values.revenue);
  if (margin !== null)
    metrics.push({
      id: "net-margin",
      label: "Margem líquida acumulada",
      value: margin,
      unit: "%",
      formula: "Lucro líquido ÷ receita acumulada × 100",
      interpretation: "Parcela da receita acumulada convertida em resultado líquido.",
      limitation: null,
      source: "virtus",
    });

  const equityRatio = safePercent(statement.values.equity, statement.values.totalAssets);
  if (equityRatio !== null)
    metrics.push({
      id: "equity-ratio",
      label: "Patrimônio sobre ativos",
      value: equityRatio,
      unit: "%",
      formula: "Patrimônio líquido ÷ ativo total × 100",
      interpretation: "Proporção dos ativos financiada pelo patrimônio líquido.",
      limitation: null,
      source: "virtus",
    });

  const days = periodDays(statement.periodStart, statement.periodEnd);
  const currentEquity = statement.values.equity;
  const openingEquity = statement.comparatives.equity;
  if (days && currentEquity !== null && openingEquity !== null) {
    const averageEquity = (currentEquity + openingEquity) / 2;
    const periodRoe = safePercent(statement.values.netIncome, averageEquity);
    if (periodRoe !== null)
      metrics.push({
        id: "annualized-roe",
        label: "ROE anualizado",
        value: periodRoe * (365 / days),
        unit: "%",
        formula: "(Lucro acumulado ÷ patrimônio médio) × 365 ÷ dias do período",
        interpretation: "Retorno matematicamente anualizado sobre o patrimônio médio.",
        limitation: "A anualização não ajusta sazonalidade e não é uma projeção da Virtus.",
        source: "virtus",
      });
  }

  const revenueGrowth = growthPercent(
    statement.values.revenue,
    statement.comparatives.revenue
  );
  if (revenueGrowth !== null)
    metrics.push({
      id: "revenue-growth",
      label: "Variação da receita",
      value: revenueGrowth,
      unit: "%",
      formula: "(Receita atual − comparável) ÷ |receita comparável| × 100",
      interpretation: "Variação contra o período comparável apresentado pela companhia.",
      limitation: null,
      source: "virtus",
    });

  const comparativeNetIncome = statement.comparatives.netIncome;
  const incomeGrowth = growthPercent(
    statement.values.netIncome,
    comparativeNetIncome
  );
  if (incomeGrowth !== null)
    metrics.push({
      id: "net-income-change",
      label: "Variação do lucro líquido",
      value: incomeGrowth,
      unit: "%",
      formula: "(Resultado atual − comparável) ÷ |resultado comparável| × 100",
      interpretation: "Mudança do resultado líquido contra o período comparável.",
      limitation:
        comparativeNetIncome !== null && comparativeNetIncome < 0
          ? "A base comparável era negativa; leia a variação junto dos valores absolutos."
          : null,
      source: "virtus",
    });
  return metrics;
}
