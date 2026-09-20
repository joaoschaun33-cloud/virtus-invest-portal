import { fetchTreasuryOverview, type TreasuryBond } from "./treasuryData";
import { getMacroBrief } from "./macroData";

export type YieldPoint = {
  label: string;
  category: "PREFIXADO" | "IPCA" | "SELIC";
  maturityDate: string;
  maturityYear: number;
  yearsToMaturity: number;
  rate: number;
  bondName: string;
  unitPrice: number;
};

export type CurveSlope = {
  shortRate: number;
  shortLabel: string;
  longRate: number;
  longLabel: string;
  spreadBps: number;
  structure: "INCLINADA" | "ACHATADA" | "INVERTIDA";
  interpretation: string;
};

export type BreakevenInflation = {
  referenceYear: number;
  prefixadoRate: number;
  ipcaRealRate: number;
  impliedInflation: number;
  cmnTarget: number;
  cmnCeiling: number;
  status: "DENTRO_DA_META" | "NO_TETO" | "ACIMA_DA_META";
  interpretation: string;
};

export type EquityRiskPremium = {
  benchmarkBondName: string;
  sovereignRealYield: number;
  estimatedEquityYield: number;
  spreadPercent: number;
  interpretation: string;
};

export type YieldCurveData = {
  checkedAt: string;
  asOf: string;
  selicRate: number;
  ipca12m: number;
  pointsPrefixado: YieldPoint[];
  pointsIpca: YieldPoint[];
  slope: CurveSlope | null;
  breakeven: BreakevenInflation | null;
  erp: EquityRiskPremium | null;
  sources: Array<{ name: string; url: string; role: string }>;
};

const CMN_TARGET = 3.0;
const CMN_CEILING = 4.5;
const ESTIMATED_EQUITY_EARNINGS_YIELD = 11.2; // Earnings Yield referencial da B3 (P/L projetado ~8.9x)

function extractNumericRate(annualRate: string): number | null {
  const match = /([\d]+[.,][\d]+)%/.exec(annualRate);
  if (!match) return null;
  const normalized = match[1].replace(",", ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function parseYearFromMaturity(maturityDate: string): number {
  const parts = maturityDate.split("/");
  if (parts.length === 3) {
    const year = Number(parts[2]);
    if (Number.isFinite(year)) return year;
  }
  return new Date().getFullYear();
}

function calculateYearsToMaturity(maturityDate: string, baseYear = new Date().getFullYear()): number {
  const targetYear = parseYearFromMaturity(maturityDate);
  return Math.max(0.5, targetYear - baseYear);
}

export function buildYieldCurve(
  treasuryBonds: TreasuryBond[],
  selic: number,
  ipca12m: number,
  asOfDate: string
): YieldCurveData {
  const currentYear = new Date().getFullYear();

  // 1. Processar pontos Prefixados
  const prefixados: YieldPoint[] = [];
  for (const b of treasuryBonds) {
    if (b.category !== "PREFIXADO") continue;
    const rate = extractNumericRate(b.annualRate);
    if (rate === null) continue;
    const year = parseYearFromMaturity(b.maturityDate);
    prefixados.push({
      label: `${year}`,
      category: "PREFIXADO",
      maturityDate: b.maturityDate,
      maturityYear: year,
      yearsToMaturity: calculateYearsToMaturity(b.maturityDate, currentYear),
      rate,
      bondName: b.name,
      unitPrice: b.unitPrice,
    });
  }
  prefixados.sort((a, b) => a.yearsToMaturity - b.yearsToMaturity);

  // 2. Processar pontos IPCA+
  const ipcaPoints: YieldPoint[] = [];
  for (const b of treasuryBonds) {
    if (b.category !== "IPCA") continue;
    const rate = extractNumericRate(b.annualRate);
    if (rate === null) continue;
    const year = parseYearFromMaturity(b.maturityDate);
    ipcaPoints.push({
      label: `${year}`,
      category: "IPCA",
      maturityDate: b.maturityDate,
      maturityYear: year,
      yearsToMaturity: calculateYearsToMaturity(b.maturityDate, currentYear),
      rate,
      bondName: b.name,
      unitPrice: b.unitPrice,
    });
  }
  ipcaPoints.sort((a, b) => a.yearsToMaturity - b.yearsToMaturity);

  // 3. Inclinação da Curva (Slope)
  let slope: CurveSlope | null = null;
  if (prefixados.length >= 2 || (prefixados.length >= 1 && selic > 0)) {
    const shortRate = prefixados[0]?.rate ?? selic;
    const shortLabel = prefixados[0]?.label ? `Pref ${prefixados[0].label}` : "Selic Meta";
    const longest = prefixados[prefixados.length - 1];
    const longRate = longest ? longest.rate : shortRate;
    const longLabel = longest ? `Pref ${longest.label}` : shortLabel;

    const spreadBps = Math.round((longRate - shortRate) * 100);
    let structure: CurveSlope["structure"] = "ACHATADA";
    let interpretation = "Estrutura a termo equilibrada entre prêmio de risco longo e curto.";

    if (spreadBps > 50) {
      structure = "INCLINADA";
      interpretation =
        "Curva positivamente inclinada: mercado exige prêmio de liquidez e risco para horizontes longos, típico de expectativa de expansão ou cautela fiscal futura.";
    } else if (spreadBps < -40) {
      structure = "INVERTIDA";
      interpretation =
        "Curva invertida: juro curto supera o longo, sinalizando aperto monetário rigoroso no presente e expectativa de cortes de juros futuros pelo Copom.";
    } else {
      structure = "ACHATADA";
      interpretation =
        "Curva achatada (flat): taxas curtas e longas convergem, indicando transição de ciclo macroeconômico ou estabilização da política monetária.";
    }

    slope = {
      shortRate,
      shortLabel,
      longRate,
      longLabel,
      spreadBps,
      structure,
      interpretation,
    };
  }

  // 4. Inflação Implícita (Breakeven Inflation pela Relação de Fisher)
  let breakeven: BreakevenInflation | null = null;
  if (prefixados.length && ipcaPoints.length) {
    let bestPair: { pref: YieldPoint; ipca: YieldPoint } | null = null;
    let minYearDiff = Infinity;

    for (const p of prefixados) {
      for (const i of ipcaPoints) {
        const diff = Math.abs(p.maturityYear - i.maturityYear);
        if (diff < minYearDiff && p.maturityYear >= currentYear + 1) {
          minYearDiff = diff;
          bestPair = { pref: p, ipca: i };
        }
      }
    }

    if (bestPair && minYearDiff <= 2) {
      const { pref, ipca } = bestPair;
      const impliedFraction = (1 + pref.rate / 100) / (1 + ipca.rate / 100) - 1;
      const impliedInflation = Number((impliedFraction * 100).toFixed(2));

      let status: BreakevenInflation["status"] = "DENTRO_DA_META";
      let interpretation = "";

      if (impliedInflation > CMN_CEILING) {
        status = "ACIMA_DA_META";
        interpretation = `Inflação implícita em ${impliedInflation.toFixed(2)}% a.a. precifica desancoragem em relação ao teto do CMN (${CMN_CEILING.toFixed(1)}%).`;
      } else if (impliedInflation >= CMN_TARGET) {
        status = "NO_TETO";
        interpretation = `Inflação implícita em ${impliedInflation.toFixed(2)}% a.a. situa-se acima da meta central (${CMN_TARGET.toFixed(1)}%), mas dentro da banda de tolerância.`;
      } else {
        status = "DENTRO_DA_META";
        interpretation = `Inflação implícita de ${impliedInflation.toFixed(2)}% a.a. alinhada com as metas do Conselho Monetário Nacional.`;
      }

      breakeven = {
        referenceYear: pref.maturityYear,
        prefixadoRate: pref.rate,
        ipcaRealRate: ipca.rate,
        impliedInflation,
        cmnTarget: CMN_TARGET,
        cmnCeiling: CMN_CEILING,
        status,
        interpretation,
      };
    }
  }

  // 5. Equity Risk Premium (ERP) Referencial
  let erp: EquityRiskPremium | null = null;
  const benchmarkIpca = ipcaPoints.find(p => p.maturityYear >= currentYear + 4) ?? ipcaPoints[0];
  if (benchmarkIpca) {
    const sovereignRealYield = benchmarkIpca.rate;
    const spreadPercent = Number(
      (ESTIMATED_EQUITY_EARNINGS_YIELD - sovereignRealYield).toFixed(2)
    );
    erp = {
      benchmarkBondName: benchmarkIpca.bondName,
      sovereignRealYield,
      estimatedEquityYield: ESTIMATED_EQUITY_EARNINGS_YIELD,
      spreadPercent,
      interpretation:
        spreadPercent >= 4.0
          ? "Prêmio de risco favorável para ativos de renda variável em relação ao juro real soberano."
          : "Prêmio de risco estreito: o juro real elevado dos títulos públicos NTN-B concorre fortemente com a atratividade da bolsa.",
    };
  }

  return {
    checkedAt: new Date().toISOString(),
    asOf: asOfDate,
    selicRate: selic,
    ipca12m,
    pointsPrefixado: prefixados,
    pointsIpca: ipcaPoints,
    slope,
    breakeven,
    erp,
    sources: [
      {
        name: "Tesouro Nacional",
        url: "https://www.tesourotransparente.gov.br",
        role: "Taxas oficiais de compra e venda de títulos públicos federais",
      },
      {
        name: "Banco Central do Brasil",
        url: "https://api.bcb.gov.br",
        role: "Taxa Selic Meta e IPCA acumulado oficial",
      },
    ],
  };
}

let cachedCurve: YieldCurveData | null = null;
let cachedCurveTime = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

export async function getYieldCurveData(): Promise<YieldCurveData> {
  if (cachedCurve && Date.now() - cachedCurveTime < CACHE_TTL_MS) {
    return cachedCurve;
  }

  const [treasury, macro] = await Promise.all([
    fetchTreasuryOverview(),
    getMacroBrief(),
  ]);

  const selic = macro.indicators.find(i => i.id === "selic")?.value ?? 10.5;
  const ipca = macro.indicators.find(i => i.id === "ipca12m")?.value ?? 4.0;

  const result = buildYieldCurve(
    treasury.bonds,
    selic,
    ipca,
    treasury.updatedAt || new Date().toISOString()
  );

  cachedCurve = result;
  cachedCurveTime = Date.now();
  return result;
}
