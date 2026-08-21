import type { MarketDataSource } from "@shared/marketData";

export type MacroIndicator = {
  id: "selic" | "ipca12m" | "usdbrl";
  label: string;
  value: number;
  unit: "percent" | "currency";
  asOf: Date;
  detail: string;
  source: MarketDataSource;
  sourceLabel: string;
};

export type MacroBrief = {
  source: "Banco Central do Brasil" | "IBGE e Banco Central do Brasil";
  checkedAt: Date;
  indicators: MacroIndicator[];
  summary: string;
};

const BCB_BASE_URL = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";
const IBGE_IPCA_URL =
  "https://servicodados.ibge.gov.br/api/v3/agregados/7060/periodos/-1/variaveis/2265?localidades=N1[all]&classificacao=315[7169]";
const CACHE_TTL_MS = 20 * 60 * 1000;
const series = [
  {
    id: "selic" as const,
    code: 1178,
    label: "Selic",
    unit: "percent" as const,
    detail: "Taxa Selic anualizada",
    source: "bcb" as const,
    sourceLabel: "Banco Central do Brasil" as const,
  },
  {
    id: "ipca12m" as const,
    code: 13522,
    label: "IPCA · 12 meses",
    unit: "percent" as const,
    detail: "Inflação acumulada em 12 meses",
    source: "bcb" as const,
    sourceLabel: "Banco Central do Brasil" as const,
  },
  {
    id: "usdbrl" as const,
    code: 1,
    label: "Dólar · venda",
    unit: "currency" as const,
    detail: "Câmbio livre · dólar americano",
    source: "bcb" as const,
    sourceLabel: "Banco Central do Brasil" as const,
  },
];

let cachedBrief: MacroBrief | null = null;
let cachedAt = 0;

function parseBcbDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(`${year}-${month}-${day}T12:00:00.000Z`);
  return Number.isNaN(date.valueOf()) ? null : date;
}

export function parseBcbNumber(value: unknown): number | null {
  const normalized =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(normalized) ? normalized : null;
}

async function fetchBcbSeries(
  definition: (typeof series)[number]
): Promise<MacroIndicator | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch(
      `${BCB_BASE_URL}.${definition.code}/dados/ultimos/1?formato=json`,
      { signal: controller.signal, headers: { Accept: "application/json" } }
    );
    if (!response.ok) return null;
    const rows = (await response.json()) as Array<{
      data?: unknown;
      valor?: unknown;
    }>;
    const row = Array.isArray(rows) ? rows[0] : null;
    const value = parseBcbNumber(row?.valor);
    const asOf = parseBcbDate(row?.data);
    if (value === null || !asOf) return null;
    return {
      id: definition.id,
      label: definition.label,
      value,
      unit: definition.unit,
      asOf,
      detail: definition.detail,
      source: definition.source,
      sourceLabel: definition.sourceLabel,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

type IbgeAggregateResponse = Array<{
  resultados?: Array<{
    series?: Array<{
      serie?: Record<string, unknown>;
    }>;
  }>;
}>;

export function parseIbgeIpcaResponse(payload: unknown): MacroIndicator | null {
  const typed = payload as IbgeAggregateResponse;
  const values = typed?.[0]?.resultados?.[0]?.series?.[0]?.serie;
  if (!values || typeof values !== "object") return null;
  const latest = Object.entries(values)
    .filter(([period]) => /^\d{6}$/.test(period))
    .sort(([left], [right]) => right.localeCompare(left))[0];
  if (!latest) return null;
  const [period, rawValue] = latest;
  const value = parseBcbNumber(rawValue);
  const year = period.slice(0, 4);
  const month = period.slice(4, 6);
  const asOf = new Date(`${year}-${month}-01T12:00:00.000Z`);
  if (value === null || Number.isNaN(asOf.valueOf())) return null;
  return {
    id: "ipca12m",
    label: "IPCA · 12 meses",
    value,
    unit: "percent",
    asOf,
    detail: "Inflação acumulada em 12 meses · índice geral Brasil",
    source: "ibge",
    sourceLabel: "IBGE",
  };
}

async function fetchIbgeIpca(): Promise<MacroIndicator | null> {
  try {
    const response = await fetch(IBGE_IPCA_URL, {
      signal: AbortSignal.timeout(6500),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    return parseIbgeIpcaResponse(await response.json());
  } catch {
    return null;
  }
}

function buildSummary(indicators: MacroIndicator[]) {
  const selic = indicators.find(item => item.id === "selic");
  const ipca = indicators.find(item => item.id === "ipca12m");
  if (selic && ipca)
    return `A Selic está em ${selic.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% ao ano e o IPCA acumulado em 12 meses em ${ipca.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%. Use estes dados como contexto, não como recomendação.`;
  return "Indicadores oficiais de fontes públicas para contextualizar a leitura do mercado.";
}

export async function getMacroBrief(): Promise<MacroBrief> {
  if (cachedBrief && Date.now() - cachedAt < CACHE_TTL_MS) return cachedBrief;
  const [ibgeIpca, ...bcbIndicators] = await Promise.all([
    fetchIbgeIpca(),
    ...series.map(fetchBcbSeries),
  ]);
  const bcbAvailable = bcbIndicators.filter(
    (item): item is MacroIndicator => item !== null
  );
  const bcbIpca = bcbAvailable.find(item => item.id === "ipca12m");
  const availableById = new Map(
    [...bcbAvailable, ibgeIpca ?? bcbIpca]
      .filter(
        (item): item is MacroIndicator => item !== null && item !== undefined
      )
      .map(item => [item.id, item])
  );
  const indicators = (["selic", "ipca12m", "usdbrl"] as const).flatMap(id => {
    const indicator = availableById.get(id);
    return indicator ? [indicator] : [];
  });
  const brief = {
    source: ibgeIpca
      ? ("IBGE e Banco Central do Brasil" as const)
      : ("Banco Central do Brasil" as const),
    checkedAt: new Date(),
    indicators,
    summary: buildSummary(indicators),
  };
  cachedBrief = brief;
  cachedAt = Date.now();
  return brief;
}
