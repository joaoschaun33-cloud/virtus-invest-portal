export type QuantPosition = {
  ticker: string;
  assetType?: string; // "STOCK" | "REIT" | "ETF" | "CRYPTO" | "INDEX" | "TREASURY";
  currentValue: number;
};

export type PortfolioRiskMetrics = {
  totalValue: number;
  dailyVolatilityPercent: number;
  annualVolatilityPercent: number;
  var95DailyAmount: number;
  var95DailyPercent: number;
  var99DailyAmount: number;
  var99DailyPercent: number;
  var95MonthlyAmount: number;
  var95MonthlyPercent: number;
  var99MonthlyAmount: number;
  var99MonthlyPercent: number;
  cvar95DailyAmount: number;
  cvar95DailyPercent: number;
  sharpeRatio: number;
  riskProfile: "CONSERVADOR" | "MODERADO" | "ARROJADO";
  diversificationScore: number; // 0 a 100
};

export type StressScenarioResult = {
  id: string;
  name: string;
  period: string;
  description: string;
  estimatedLossAmount: number;
  estimatedLossPercent: number;
  estimatedRemainingValue: number;
  severity: "ALTA" | "MÉDIA" | "EXTREMA";
  breakdown: Array<{
    assetType: string;
    value: number;
    shockPercent: number;
    impactAmount: number;
  }>;
};

// Volatilidade diária empírica por classe de ativo (base mercado brasileiro)
const ASSET_CLASS_VOLATILITY: Record<string, number> = {
  STOCK: 0.0185, // ~29.4% a.a.
  REIT: 0.009, // ~14.3% a.a.
  ETF: 0.015, // ~23.8% a.a.
  CRYPTO: 0.042, // ~66.7% a.a.
  INDEX: 0.014, // ~22.2% a.a.
  TREASURY: 0.004, // ~6.3% a.a.
  COMMODITY: 0.02, // ~31.7% a.a.
  FOREX: 0.011, // ~17.5% a.a.
};

// Choques por classe de ativo em cada cenário histórico
const STRESS_SCENARIOS = [
  {
    id: "covid-19",
    name: "Crash Global Covid-19",
    period: "Fev - Mar 2020",
    severity: "EXTREMA" as const,
    description:
      "Queda abrupta generalizada em ativos de risco e circuit-breakers sucessivos na B3 com fuga global para liquidez.",
    shocks: {
      STOCK: -38.5,
      REIT: -19.0,
      ETF: -34.0,
      CRYPTO: -46.0,
      INDEX: -36.0,
      TREASURY: -6.5,
      COMMODITY: -28.0,
      FOREX: +18.0, // Alta do dólar amortece posições dolarizadas
    },
  },
  {
    id: "joesley-day",
    name: "Joesley Day",
    period: "18 de Maio de 2017",
    severity: "MÉDIA" as const,
    description:
      "Choque político institucional súbito com paralisação das negociações na B3 e abertura imediata da curva futura de juros.",
    shocks: {
      STOCK: -12.5,
      REIT: -4.5,
      ETF: -11.0,
      CRYPTO: 0.0,
      INDEX: -10.5,
      TREASURY: -8.0, // Marcação a mercado de títulos longos
      COMMODITY: -5.0,
      FOREX: +8.5,
    },
  },
  {
    id: "rate-shock",
    name: "Aperto Monetário & Bear Market",
    period: "Ciclo 2021 - 2022",
    severity: "ALTA" as const,
    description:
      "Elevação rápida da taxa Selic de 2% para 13,75% a.a., comprimindo múltiplos de ações de crescimento e títulos prefixados longos.",
    shocks: {
      STOCK: -22.0,
      REIT: -12.0,
      ETF: -18.0,
      CRYPTO: -60.0,
      INDEX: -16.0,
      TREASURY: -14.0,
      COMMODITY: +15.0,
      FOREX: +4.0,
    },
  },
  {
    id: "subprime-2008",
    name: "Crise Financeira Global (Subprime)",
    period: "Set - Out 2008",
    severity: "EXTREMA" as const,
    description:
      "Colapso de liquidez bancária internacional, congelamento do crédito global e retração severa do comércio internacional.",
    shocks: {
      STOCK: -45.0,
      REIT: -25.0,
      ETF: -42.0,
      CRYPTO: -55.0,
      INDEX: -44.0,
      TREASURY: +3.0, // Títulos pós-fixados indexados à Selic amortecem
      COMMODITY: -35.0,
      FOREX: +32.0,
    },
  },
];

export function calculatePortfolioRisk(
  positions: QuantPosition[],
  riskFreeRateAnnual = 10.5, // Selic referencial a.a.
  estimatedPortfolioReturnAnnual = 14.0 // Retorno esperado da carteira
): PortfolioRiskMetrics | null {
  const validPositions = positions.filter(p => p.currentValue > 0);
  const totalValue = validPositions.reduce((sum, p) => sum + p.currentValue, 0);

  if (totalValue <= 0 || !validPositions.length) return null;

  // Pesos de cada ativo
  const weights = validPositions.map(p => ({
    ...p,
    weight: p.currentValue / totalValue,
    dailyVol: ASSET_CLASS_VOLATILITY[p.assetType ?? "STOCK"] ?? 0.016,
  }));

  // Cálculo da variância ponderada com fator de diversificação
  // Var_p = sum(w_i^2 * vol_i^2) + sum_{i!=j}(w_i * w_j * vol_i * vol_j * rho)
  const averageCorrelation = validPositions.length > 1 ? 0.65 : 1.0;
  let variance = 0;

  for (let i = 0; i < weights.length; i++) {
    const wi = weights[i].weight;
    const voli = weights[i].dailyVol;
    variance += Math.pow(wi * voli, 2);

    for (let j = 0; j < weights.length; j++) {
      if (i !== j) {
        const wj = weights[j].weight;
        const volj = weights[j].dailyVol;
        variance += wi * wj * voli * volj * averageCorrelation;
      }
    }
  }

  const dailyVolatility = Math.sqrt(variance);
  const annualVolatility = dailyVolatility * Math.sqrt(252);

  // Fatores Z para VaR paramétrico (Distribuição Normal)
  const Z_95 = 1.645;
  const Z_99 = 2.326;
  const MONTHLY_FACTOR = Math.sqrt(21); // 21 dias úteis no mês

  // VaR 1 Dia
  const var95DailyPercent = dailyVolatility * Z_95 * 100;
  const var95DailyAmount = totalValue * (var95DailyPercent / 100);

  const var99DailyPercent = dailyVolatility * Z_99 * 100;
  const var99DailyAmount = totalValue * (var99DailyPercent / 100);

  // VaR 21 Dias (Mensal)
  const var95MonthlyPercent = var95DailyPercent * MONTHLY_FACTOR;
  const var95MonthlyAmount = totalValue * (var95MonthlyPercent / 100);

  const var99MonthlyPercent = var99DailyPercent * MONTHLY_FACTOR;
  const var99MonthlyAmount = totalValue * (var99MonthlyPercent / 100);

  // Conditional VaR (CVaR / Expected Shortfall 95%)
  // Aproximação normal da cauda: CVaR_95 ~ 1.25 * VaR_95
  const cvar95DailyPercent = var95DailyPercent * 1.25;
  const cvar95DailyAmount = totalValue * (cvar95DailyPercent / 100);

  // Sharpe Ratio = (Retorno Esperado - Taxa Livre de Risco) / Volatilidade
  const excessReturn = estimatedPortfolioReturnAnnual - riskFreeRateAnnual;
  const sharpeRatio =
    annualVolatility > 0
      ? Number((excessReturn / (annualVolatility * 100)).toFixed(2))
      : 0;

  // Perfil de Risco baseado na volatilidade anual
  let riskProfile: PortfolioRiskMetrics["riskProfile"] = "MODERADO";
  if (annualVolatility * 100 < 12.0) {
    riskProfile = "CONSERVADOR";
  } else if (annualVolatility * 100 > 24.0) {
    riskProfile = "ARROJADO";
  } else {
    riskProfile = "MODERADO";
  }

  // Score de diversificação (Herfindahl-Hirschman Inverso)
  const hhi = weights.reduce((sum, w) => sum + Math.pow(w.weight, 2), 0);
  const diversificationScore = Math.min(
    100,
    Math.round((1 - hhi) * 125 * (validPositions.length > 1 ? 1 : 0))
  );

  return {
    totalValue,
    dailyVolatilityPercent: Number((dailyVolatility * 100).toFixed(2)),
    annualVolatilityPercent: Number((annualVolatility * 100).toFixed(2)),
    var95DailyAmount: Number(var95DailyAmount.toFixed(2)),
    var95DailyPercent: Number(var95DailyPercent.toFixed(2)),
    var99DailyAmount: Number(var99DailyAmount.toFixed(2)),
    var99DailyPercent: Number(var99DailyPercent.toFixed(2)),
    var95MonthlyAmount: Number(var95MonthlyAmount.toFixed(2)),
    var95MonthlyPercent: Number(var95MonthlyPercent.toFixed(2)),
    var99MonthlyAmount: Number(var99MonthlyAmount.toFixed(2)),
    var99MonthlyPercent: Number(var99MonthlyPercent.toFixed(2)),
    cvar95DailyAmount: Number(cvar95DailyAmount.toFixed(2)),
    cvar95DailyPercent: Number(cvar95DailyPercent.toFixed(2)),
    sharpeRatio,
    riskProfile,
    diversificationScore,
  };
}

export function simulateStressScenarios(
  positions: QuantPosition[]
): StressScenarioResult[] {
  const validPositions = positions.filter(p => p.currentValue > 0);
  const totalValue = validPositions.reduce((sum, p) => sum + p.currentValue, 0);

  if (totalValue <= 0) return [];

  return STRESS_SCENARIOS.map(scenario => {
    let scenarioLoss = 0;
    const breakdown = validPositions.map(pos => {
      const assetType = pos.assetType ?? "STOCK";
      const shockPercent =
        (scenario.shocks as Record<string, number>)[assetType] ?? -20.0;
      const impactAmount = pos.currentValue * (shockPercent / 100);
      scenarioLoss += impactAmount;

      return {
        assetType,
        value: pos.currentValue,
        shockPercent,
        impactAmount: Number(impactAmount.toFixed(2)),
      };
    });

    const estimatedLossAmount = Math.abs(Number(scenarioLoss.toFixed(2)));
    const estimatedLossPercent = Number(
      ((estimatedLossAmount / totalValue) * 100).toFixed(2)
    );
    const estimatedRemainingValue = Number(
      (totalValue - estimatedLossAmount).toFixed(2)
    );

    return {
      id: scenario.id,
      name: scenario.name,
      period: scenario.period,
      description: scenario.description,
      estimatedLossAmount,
      estimatedLossPercent,
      estimatedRemainingValue,
      severity: scenario.severity,
      breakdown,
    };
  });
}
