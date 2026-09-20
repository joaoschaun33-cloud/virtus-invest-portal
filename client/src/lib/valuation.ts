export type Signal = "positive" | "attention" | "negative" | "neutral";

export type ValuationInput = {
  price: number;
  bookValuePerShare: number;
  earningsPerShare: number;
  pe: number | null;
  dividendPerShare: number;
  earningsGrowth: number;
  roe: number | null;
  netMargin: number | null;
  netDebtEbitda: number | null;
  growingProfitFiveYears: boolean | null;
};

export function calculateValuation(input: ValuationInput) {
  const grahamPrice =
    input.bookValuePerShare > 0 && input.earningsPerShare > 0
      ? Math.sqrt(22.5 * input.bookValuePerShare * input.earningsPerShare)
      : null;
  const grahamMargin =
    grahamPrice && input.price > 0
      ? ((grahamPrice - input.price) / input.price) * 100
      : null;
  const bazinPrice =
    input.dividendPerShare > 0 ? input.dividendPerShare / 0.06 : null;
  const dividendYield =
    input.dividendPerShare > 0 && input.price > 0
      ? (input.dividendPerShare / input.price) * 100
      : null;
  const peg =
    input.pe && input.pe > 0 && input.earningsGrowth > 0
      ? input.pe / input.earningsGrowth
      : null;
  const criteria = [
    {
      label: "ROE acima de 15%",
      value: input.roe,
      display: input.roe === null ? "Sem dado" : `${input.roe.toFixed(1)}%`,
      passes: input.roe !== null && input.roe > 15,
    },
    {
      label: "Margem líquida acima de 10%",
      value: input.netMargin,
      display:
        input.netMargin === null ? "Sem dado" : `${input.netMargin.toFixed(1)}%`,
      passes: input.netMargin !== null && input.netMargin > 10,
    },
    {
      label: "Dívida líquida / EBITDA abaixo de 2x",
      value: input.netDebtEbitda,
      display:
        input.netDebtEbitda === null
          ? "Sem dado"
          : `${input.netDebtEbitda.toFixed(2)}x`,
      passes: input.netDebtEbitda !== null && input.netDebtEbitda < 2,
    },
    {
      label: "Lucro crescente em cinco anos",
      value: input.growingProfitFiveYears,
      display:
        input.growingProfitFiveYears === null
          ? "Sem dado"
          : input.growingProfitFiveYears
          ? "Sim"
          : "Não",
      passes: input.growingProfitFiveYears === true,
    },
  ];
  const evaluated = criteria.filter(item => item.value !== null);
  const score = evaluated.filter(item => item.passes).length;
  return {
    grahamPrice,
    grahamMargin,
    bazinPrice,
    dividendYield,
    peg,
    criteria,
    score,
    evaluated: evaluated.length,
  };
}

export function signalForMargin(value: number | null): Signal {
  if (value === null) return "neutral";
  return value >= 0 ? "positive" : "negative";
}

export function signalForPeg(value: number | null): Signal {
  if (value === null) return "neutral";
  if (value < 1) return "positive";
  if (value <= 1.5) return "attention";
  return "negative";
}

/* =====================================================================
   Modelos Institucionais Avançados (Fase 2)
   ===================================================================== */

/**
 * Modelo de Graham com Margem de Segurança Customizada
 */
export function calculateGrahamWithMargin(
  bookValuePerShare: number,
  earningsPerShare: number,
  price: number,
  requiredMarginPercent = 20
) {
  if (bookValuePerShare <= 0 || earningsPerShare <= 0 || price <= 0) {
    return null;
  }
  const fairValue = Math.sqrt(22.5 * bookValuePerShare * earningsPerShare);
  const buyPriceWithMargin = fairValue * (1 - requiredMarginPercent / 100);
  const currentMargin = ((fairValue - price) / price) * 100;
  const isAttractive = price <= buyPriceWithMargin;

  return {
    fairValue,
    buyPriceWithMargin,
    currentMargin,
    isAttractive,
    requiredMarginPercent,
  };
}

/**
 * Método Décio Bazin com Dividend Yield Alvo
 */
export function calculateBazinWithTarget(
  dividendPerShare: number,
  price: number,
  targetYieldPercent = 6.0
) {
  if (dividendPerShare <= 0 || price <= 0 || targetYieldPercent <= 0) {
    return null;
  }
  const ceilingPrice = dividendPerShare / (targetYieldPercent / 100);
  const margin = ((ceilingPrice - price) / price) * 100;
  const currentYield = (dividendPerShare / price) * 100;
  const isBelowCeiling = price <= ceilingPrice;

  return {
    ceilingPrice,
    margin,
    currentYield,
    targetYieldPercent,
    isBelowCeiling,
  };
}

/**
 * DCF Reverso: Calcula a taxa anual de crescimento do FCF nos próximos 5 anos
 * que o preço atual de mercado embute (Two-Stage Discounted Cash Flow).
 */
export type ReverseDcfResult = {
  impliedGrowthRate: number; // ex: 8.5 para 8.5% ao ano
  fcfPerShare: number;
  wacc: number;
  terminalGrowth: number;
  interpretation: string;
};

export function calculateReverseDcf(
  price: number,
  fcfPerShare: number,
  waccPercent = 12.0, // WACC Brasil referencial (Selic + ERP)
  terminalGrowthPercent = 3.5, // Inflação de longo prazo + PIB
  projectionYears = 5
): ReverseDcfResult | null {
  if (price <= 0 || fcfPerShare <= 0) return null;
  const wacc = waccPercent / 100;
  const gTerm = terminalGrowthPercent / 100;
  if (wacc <= gTerm) return null;

  // Função que precifica o ativo para uma dada taxa de crescimento 'g'
  function evaluatePv(growthRate: number): number {
    let pvCashFlows = 0;
    let currentFcf = fcfPerShare;

    for (let t = 1; t <= projectionYears; t++) {
      currentFcf *= 1 + growthRate;
      pvCashFlows += currentFcf / Math.pow(1 + wacc, t);
    }

    const terminalValue = (currentFcf * (1 + gTerm)) / (wacc - gTerm);
    const pvTerminal = terminalValue / Math.pow(1 + wacc, projectionYears);

    return pvCashFlows + pvTerminal;
  }

  // Busca binária para encontrar a taxa implícita de crescimento (-50% a +100%)
  let low = -0.5;
  let high = 1.0;
  let impliedRate = 0;

  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    const estimatedPrice = evaluatePv(mid);

    if (Math.abs(estimatedPrice - price) < 0.05) {
      impliedRate = mid;
      break;
    }

    if (estimatedPrice < price) {
      low = mid;
    } else {
      high = mid;
    }
    impliedRate = mid;
  }

  const impliedGrowthRate = Number((impliedRate * 100).toFixed(2));
  let interpretation = "";

  if (impliedGrowthRate > 20) {
    interpretation = `O mercado precifica crescimento agressivo de ${impliedGrowthRate}% a.a. nos próximos 5 anos. Exige execução impecável da empresa.`;
  } else if (impliedGrowthRate > 8) {
    interpretation = `O preço embute crescimento sólido de ${impliedGrowthRate}% a.a., compatível com empresas líderes de mercado.`;
  } else if (impliedGrowthRate >= 0) {
    interpretation = `Crescimento implícito moderado de ${impliedGrowthRate}% a.a., indicando expectativa conservadora ou valuation descontado.`;
  } else {
    interpretation = `Crescimento implícito negativo (${impliedGrowthRate}% a.a.): o mercado antecipa retração no fluxo de caixa ou forte pessimismo.`;
  }

  return {
    impliedGrowthRate,
    fcfPerShare,
    wacc: waccPercent,
    terminalGrowth: terminalGrowthPercent,
    interpretation,
  };
}

/**
 * Decomposição DuPont do ROE em 3 Fatores:
 * ROE = Margem Líquida x Giro do Ativo x Alavancagem Financeira
 */
export type DupontAnalysisResult = {
  netMargin: number; // Lucro Líquido / Receita Líquida (%)
  assetTurnover: number; // Receita Líquida / Ativo Total (x)
  financialLeverage: number; // Ativo Total / Patrimônio Líquido (x)
  calculatedRoe: number; // Margem x Giro x Alavancagem (%)
  primaryDriver: "MARGEM" | "GIRO" | "ALAVANCAGEM";
  riskAlert: string | null;
};

export function calculateDupontAnalysis(
  revenue: number,
  netIncome: number,
  totalAssets: number,
  equity: number
): DupontAnalysisResult | null {
  if (revenue <= 0 || totalAssets <= 0 || equity <= 0) return null;

  const netMargin = (netIncome / revenue) * 100;
  const assetTurnover = revenue / totalAssets;
  const financialLeverage = totalAssets / equity;
  const calculatedRoe = (netMargin / 100) * assetTurnover * financialLeverage * 100;

  // Identificar principal driver
  let primaryDriver: DupontAnalysisResult["primaryDriver"] = "MARGEM";
  if (financialLeverage > 3.0 && calculatedRoe > 15) {
    primaryDriver = "ALAVANCAGEM";
  } else if (assetTurnover > 1.2) {
    primaryDriver = "GIRO";
  } else {
    primaryDriver = "MARGEM";
  }

  let riskAlert: string | null = null;
  if (financialLeverage > 4.0) {
    riskAlert =
      "Atenção: Alavancagem financeira elevada (Ativo/PL > 4x). A rentabilidade do acionista é fortemente alavancada por dívida e passivos.";
  } else if (netMargin < 3.0 && netMargin > 0) {
    riskAlert =
      "Margem líquida estreita (< 3%). Pequenas variações de custos operacionais podem comprometer o lucro líquido.";
  }

  return {
    netMargin: Number(netMargin.toFixed(2)),
    assetTurnover: Number(assetTurnover.toFixed(2)),
    financialLeverage: Number(financialLeverage.toFixed(2)),
    calculatedRoe: Number(calculatedRoe.toFixed(2)),
    primaryDriver,
    riskAlert,
  };
}

/**
 * Altman Z-Score para Mercados Emergentes (EM-Score)
 * Adaptado para empresas em bolsas emergentes não-manufatureiras ou industriais gerais.
 */
export type AltmanZScoreResult = {
  score: number;
  zone: "SAFE" | "GREY" | "DISTRESS";
  zoneLabel: string;
  interpretation: string;
};

export function calculateAltmanZScore(
  workingCapital: number, // Capital de Giro
  totalAssets: number,
  retainedEarningsOrEquity: number, // Lucros acumulados ou PL
  ebitOrEbitda: number,
  equity: number,
  totalLiabilities: number
): AltmanZScoreResult | null {
  if (totalAssets <= 0 || totalLiabilities <= 0) return null;

  const x1 = workingCapital / totalAssets;
  const x2 = retainedEarningsOrEquity / totalAssets;
  const x3 = ebitOrEbitda / totalAssets;
  const x4 = equity / totalLiabilities;

  // Fórmula Altman Emerging Market Score (EM-Score):
  // Z = 6.56*X1 + 3.26*X2 + 6.72*X3 + 1.05*X4
  const zScore = 6.56 * x1 + 3.26 * x2 + 6.72 * x3 + 1.05 * x4;
  const score = Number(zScore.toFixed(2));

  let zone: AltmanZScoreResult["zone"] = "SAFE";
  let zoneLabel = "Zona Segura";
  let interpretation = "";

  if (score > 2.6) {
    zone = "SAFE";
    zoneLabel = "Zona Segura";
    interpretation =
      "Estrutura de capital sólida e saudável, com baixíssima probabilidade de estresse financeiro no horizonte de 24 meses.";
  } else if (score >= 1.1) {
    zone = "GREY";
    zoneLabel = "Zona de Alerta";
    interpretation =
      "Estrutura de capital intermediária. Requer acompanhamento da cobertura de juros e do cronograma de amortização da dívida.";
  } else {
    zone = "DISTRESS";
    zoneLabel = "Zona de Risco";
    interpretation =
      "Indicador em zona de estresse financeiro (Z < 1.1). Endividamento ou fluxo operacional exigem atenção rigorosa.";
  }

  return {
    score,
    zone,
    zoneLabel,
    interpretation,
  };
}
