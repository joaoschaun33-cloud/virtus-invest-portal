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
  const grahamPrice = input.bookValuePerShare > 0 && input.earningsPerShare > 0
    ? Math.sqrt(22.5 * input.bookValuePerShare * input.earningsPerShare)
    : null;
  const grahamMargin = grahamPrice && input.price > 0
    ? ((grahamPrice - input.price) / input.price) * 100
    : null;
  const bazinPrice = input.dividendPerShare > 0 ? input.dividendPerShare / 0.06 : null;
  const dividendYield = input.dividendPerShare > 0 && input.price > 0
    ? (input.dividendPerShare / input.price) * 100
    : null;
  const peg = input.pe && input.pe > 0 && input.earningsGrowth > 0
    ? input.pe / input.earningsGrowth
    : null;
  const criteria = [
    { label: "ROE acima de 15%", value: input.roe, display: input.roe === null ? "Sem dado" : `${input.roe.toFixed(1)}%`, passes: input.roe !== null && input.roe > 15 },
    { label: "Margem líquida acima de 10%", value: input.netMargin, display: input.netMargin === null ? "Sem dado" : `${input.netMargin.toFixed(1)}%`, passes: input.netMargin !== null && input.netMargin > 10 },
    { label: "Dívida líquida / EBITDA abaixo de 2x", value: input.netDebtEbitda, display: input.netDebtEbitda === null ? "Sem dado" : `${input.netDebtEbitda.toFixed(2)}x`, passes: input.netDebtEbitda !== null && input.netDebtEbitda < 2 },
    { label: "Lucro crescente em cinco anos", value: input.growingProfitFiveYears, display: input.growingProfitFiveYears === null ? "Sem dado" : input.growingProfitFiveYears ? "Sim" : "Não", passes: input.growingProfitFiveYears === true },
  ];
  const evaluated = criteria.filter(item => item.value !== null);
  const score = evaluated.filter(item => item.passes).length;
  return { grahamPrice, grahamMargin, bazinPrice, dividendYield, peg, criteria, score, evaluated: evaluated.length };
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
