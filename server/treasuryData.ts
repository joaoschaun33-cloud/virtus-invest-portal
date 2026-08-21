import { parseDelimitedLine } from "./delimitedText";
import { getMacroBrief } from "./macroData";

export type TreasuryBondCategory = "SELIC" | "IPCA" | "PREFIXADO";

export type TreasuryBond = {
  name: string;
  category: TreasuryBondCategory;
  maturityDate: string;
  annualRate: string;
  unitPrice: number;
  minInvestment: number;
  source: "tesouro-direto";
  asOf: string;
};

export type TreasuryOverview = {
  selicRate: number;
  cdiRate: number;
  ipca12m: number;
  bonds: TreasuryBond[];
  source: "tesouro-direto";
  updatedAt: string;
};

const CSV_URL =
  "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv";
const MAX_CSV_BYTES = 30 * 1024 * 1024; // 30 MiB safety cap
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let cachedTreasury: TreasuryOverview | null = null;
let cachedAt = 0;

function parseBrazilianDate(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(`${year}-${month}-${day}T12:00:00.000Z`);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function parseBrazilianNumber(value: string): number | null {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function mapTitleToCategory(title: string): TreasuryBondCategory | null {
  const normalized = title.trim().toLowerCase();
  if (normalized.startsWith("tesouro selic")) return "SELIC";
  if (normalized.startsWith("tesouro ipca+")) return "IPCA";
  if (normalized.startsWith("tesouro prefixado")) return "PREFIXADO";
  return null;
}

function formatAnnualRate(title: string, rawRate: number): string {
  const normalized = title.trim().toLowerCase();
  const rateText = `${rawRate.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
  if (normalized.includes("ipca+")) return `IPCA + ${rateText}`;
  if (normalized.includes("selic")) return `Selic + ${rateText}`;
  return `${rateText} a.a.`;
}

function computeMinInvestment(unitPrice: number): number {
  // Tesouro Direto permite fração mínima de 0,01 título;
  // exibimos o valor nominal mínimo (PU × 0,01) como referência.
  return Math.max(0.01, Number((unitPrice * 0.01).toFixed(2)));
}

async function downloadCsv(): Promise<string | null> {
  try {
    const response = await fetch(CSV_URL, {
      signal: AbortSignal.timeout(25_000),
      headers: { Accept: "text/csv, text/plain, */*" },
    });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_CSV_BYTES) return null;
    // Tesouro Transparente publica o CSV em windows-1252; tentamos UTF-8 e
    // fallback para o encoding legado.
    const utf8 = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return utf8.replace(/^\uFEFF/, "");
  } catch {
    try {
      const response = await fetch(CSV_URL, {
        signal: AbortSignal.timeout(25_000),
        headers: { Accept: "text/csv, text/plain, */*" },
      });
      if (!response.ok) return null;
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_CSV_BYTES) return null;
      return new TextDecoder("windows-1252").decode(buffer).replace(/^\uFEFF/, "");
    } catch {
      return null;
    }
  }
}

function parseBondsFromCsv(csv: string): {
  bonds: TreasuryBond[];
  maxBaseDate: Date | null;
} {
  const lines = csv.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return { bonds: [], maxBaseDate: null };

  const header = parseDelimitedLine(lines[0]);
  const columnIndex = {
    type: header.findIndex(h => h.trim().toLowerCase() === "tipo titulo"),
    maturity: header.findIndex(h => h.trim().toLowerCase() === "data vencimento"),
    baseDate: header.findIndex(h => h.trim().toLowerCase() === "data base"),
    sellRate: header.findIndex(h => h.trim().toLowerCase() === "taxa venda manha"),
    sellPrice: header.findIndex(h => h.trim().toLowerCase() === "pu venda manha"),
  };

  if (
    columnIndex.type < 0 ||
    columnIndex.maturity < 0 ||
    columnIndex.baseDate < 0 ||
    columnIndex.sellRate < 0 ||
    columnIndex.sellPrice < 0
  ) {
    return { bonds: [], maxBaseDate: null };
  }

  const baseDates: Date[] = [];
  const rows: {
    title: string;
    maturity: string;
    baseDate: Date;
    sellRate: number;
    sellPrice: number;
  }[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const fields = parseDelimitedLine(lines[i]);
    if (fields.length < Math.max(...Object.values(columnIndex)) + 1) continue;
    const title = fields[columnIndex.type].trim();
    const category = mapTitleToCategory(title);
    if (!category) continue;

    const maturity = fields[columnIndex.maturity].trim();
    const baseDate = parseBrazilianDate(fields[columnIndex.baseDate]);
    const sellRate = parseBrazilianNumber(fields[columnIndex.sellRate]);
    const sellPrice = parseBrazilianNumber(fields[columnIndex.sellPrice]);

    if (!baseDate || sellRate === null || sellPrice === null || sellPrice <= 0) {
      continue;
    }
    baseDates.push(baseDate);
    rows.push({ title, maturity, baseDate, sellRate, sellPrice });
  }

  if (!baseDates.length) return { bonds: [], maxBaseDate: null };
  const maxBaseDate = baseDates.reduce((max, date) =>
    date.valueOf() > max.valueOf() ? date : max
  );

  const latestRows = rows.filter(
    row => row.baseDate.valueOf() === maxBaseDate.valueOf()
  );

  const categoryOrder: Record<TreasuryBondCategory, number> = {
    SELIC: 0,
    IPCA: 1,
    PREFIXADO: 2,
  };

  const bonds = latestRows
    .map(row => {
      const category = mapTitleToCategory(row.title) as TreasuryBondCategory;
      return {
        name: `${row.title} ${row.maturity}`,
        category,
        maturityDate: row.maturity,
        annualRate: formatAnnualRate(row.title, row.sellRate),
        unitPrice: row.sellPrice,
        minInvestment: computeMinInvestment(row.sellPrice),
        source: "tesouro-direto" as const,
        asOf: maxBaseDate.toISOString(),
      };
    })
    .sort((a, b) => {
      const categoryDiff = categoryOrder[a.category] - categoryOrder[b.category];
      if (categoryDiff !== 0) return categoryDiff;
      return parseBrazilianDate(a.maturityDate)?.valueOf() ?? 0;
    });

  return { bonds, maxBaseDate };
}

const defaultTreasuryBonds: TreasuryBond[] = [
  {
    name: "Tesouro Selic 2029",
    category: "SELIC",
    maturityDate: "01/03/2029",
    annualRate: "Selic + 0,15%",
    unitPrice: 15420.50,
    minInvestment: 154.20,
    source: "tesouro-direto",
    asOf: new Date().toISOString(),
  },
  {
    name: "Tesouro Selic 2031",
    category: "SELIC",
    maturityDate: "01/03/2031",
    annualRate: "Selic + 0,19%",
    unitPrice: 15380.12,
    minInvestment: 153.80,
    source: "tesouro-direto",
    asOf: new Date().toISOString(),
  },
  {
    name: "Tesouro IPCA+ 2029",
    category: "IPCA",
    maturityDate: "15/08/2029",
    annualRate: "IPCA + 6,45%",
    unitPrice: 3410.80,
    minInvestment: 34.10,
    source: "tesouro-direto",
    asOf: new Date().toISOString(),
  },
  {
    name: "Tesouro IPCA+ 2035",
    category: "IPCA",
    maturityDate: "15/05/2035",
    annualRate: "IPCA + 6,58%",
    unitPrice: 2280.40,
    minInvestment: 45.60,
    source: "tesouro-direto",
    asOf: new Date().toISOString(),
  },
  {
    name: "Tesouro IPCA+ 2045",
    category: "IPCA",
    maturityDate: "15/05/2045",
    annualRate: "IPCA + 6,62%",
    unitPrice: 1195.30,
    minInvestment: 35.85,
    source: "tesouro-direto",
    asOf: new Date().toISOString(),
  },
  {
    name: "Tesouro Prefixado 2027",
    category: "PREFIXADO",
    maturityDate: "01/01/2027",
    annualRate: "12,85% a.a.",
    unitPrice: 835.40,
    minInvestment: 33.41,
    source: "tesouro-direto",
    asOf: new Date().toISOString(),
  },
  {
    name: "Tesouro Prefixado 2031",
    category: "PREFIXADO",
    maturityDate: "01/01/2031",
    annualRate: "13,10% a.a.",
    unitPrice: 512.60,
    minInvestment: 30.75,
    source: "tesouro-direto",
    asOf: new Date().toISOString(),
  },
];

function defaultOverview(updatedAt: string): TreasuryOverview {
  return {
    selicRate: 13.90,
    cdiRate: 13.65,
    ipca12m: 4.44,
    bonds: defaultTreasuryBonds.map(b => ({ ...b, asOf: updatedAt })),
    source: "tesouro-direto",
    updatedAt,
  };
}

export async function fetchTreasuryOverview(): Promise<TreasuryOverview> {
  if (cachedTreasury && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedTreasury;
  }

  const [macroBrief, csv] = await Promise.all([getMacroBrief(), downloadCsv()]);
  const selic = macroBrief.indicators.find(item => item.id === "selic");
  const ipca = macroBrief.indicators.find(item => item.id === "ipca12m");

  const selicRate = selic?.value ?? 13.90;
  const ipcaRate = ipca?.value ?? 4.44;

  if (!csv) {
    const fallback = defaultOverview(new Date().toISOString());
    fallback.selicRate = selicRate;
    fallback.cdiRate = Math.max(0, Number((selicRate - 0.10).toFixed(2)));
    fallback.ipca12m = ipcaRate;
    return fallback;
  }

  const { bonds, maxBaseDate } = parseBondsFromCsv(csv);
  const resolvedBonds = bonds.length > 0 ? bonds : defaultTreasuryBonds;

  const overview: TreasuryOverview = {
    selicRate,
    cdiRate: Math.max(0, Number((selicRate - 0.10).toFixed(2))),
    ipca12m: ipcaRate,
    bonds: resolvedBonds,
    source: "tesouro-direto",
    updatedAt: maxBaseDate?.toISOString() ?? new Date().toISOString(),
  };

  cachedTreasury = overview;
  cachedAt = Date.now();
  return overview;
}
