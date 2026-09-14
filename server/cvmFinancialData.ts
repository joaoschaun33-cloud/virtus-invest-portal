import { unzipSync } from "fflate";
import { parseDelimitedLine } from "./delimitedText";
import { logger } from "./_core/logger";

const CVM_DATA_ROOT = "https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_ZIP_BYTES = 25_000_000;
const MAX_STATEMENT_BYTES = 45_000_000;

type FilingKind = "ITR" | "DFP";
type StatementKind = "BPA" | "BPP" | "DRE";
type CsvRecord = Record<string, string>;

export type CvmFinancialStatements = {
  ticker: string;
  cnpj: string;
  cvmCode: string;
  companyName: string;
  filing: FilingKind;
  referenceDate: string;
  periodStart: string;
  periodEnd: string;
  version: number;
  currency: "BRL";
  values: {
    revenue: number | null;
    netIncome: number | null;
    totalAssets: number | null;
    equity: number | null;
  };
  comparatives: {
    revenue: number | null;
    netIncome: number | null;
    totalAssets: number | null;
    equity: number | null;
  };
  quarterlyHistory: CvmQuarterlyFinancialPoint[];
  source: "cvm";
  sourceUrl: string;
  asOf: string;
};

export type CvmQuarterlyFinancialPoint = {
  label: string;
  periodStart: string;
  periodEnd: string;
  revenue: number;
  netIncome: number | null;
  netMargin: number | null;
  source: "cvm";
};

const cache = new Map<
  string,
  { expiresAt: number; value: CvmFinancialStatements | null }
>();
const inFlight = new Map<string, Promise<CvmFinancialStatements | null>>();

function normalizeOrder(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function scaleToBrl(value: string, scale: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const normalizedScale = normalizeOrder(scale);
  if (normalizedScale.includes("MILHAO")) return numeric * 1_000_000;
  if (normalizedScale.includes("MIL")) return numeric * 1_000;
  return numeric;
}

function parseRows(csv: string, cnpj: string) {
  const lines = csv.split(/\r?\n/);
  const headers = parseDelimitedLine(lines[0] ?? "");
  return lines
    .filter(line => line.startsWith(`${cnpj};`))
    .map(line => {
      const values = parseDelimitedLine(line);
      return Object.fromEntries(
        headers.map((header, index) => [header, values[index] ?? ""])
      ) as CsvRecord;
    });
}

function selectLatestVersionRows(rows: CsvRecord[]) {
  const latestReference = rows.reduce(
    (latest, row) => (row.DT_REFER > latest ? row.DT_REFER : latest),
    ""
  );
  const latestVersion = rows
    .filter(row => row.DT_REFER === latestReference)
    .reduce((latest, row) => Math.max(latest, Number(row.VERSAO) || 0), 0);
  return rows.filter(
    row =>
      row.DT_REFER === latestReference &&
      Number(row.VERSAO) === latestVersion
  );
}

function rowsByOrder(rows: CsvRecord[], order: "ULTIMO" | "PENULTIMO") {
  return rows.filter(row => normalizeOrder(row.ORDEM_EXERC) === order);
}

function accountValue(rows: CsvRecord[], account: string) {
  const matches = rows.filter(row => row.CD_CONTA === account);
  if (!matches.length) return null;
  // DREs can contain quarter-only and year-to-date rows for the same account.
  // The earliest start date is the cumulative period disclosed by the issuer.
  const selected = matches.reduce((earliest, row) =>
    !earliest || (row.DT_INI_EXERC && row.DT_INI_EXERC < earliest.DT_INI_EXERC)
      ? row
      : earliest
  );
  return scaleToBrl(selected.VL_CONTA, selected.ESCALA_MOEDA);
}

function daysBetween(start: string, end: string) {
  const startTime = Date.parse(`${start}T00:00:00Z`);
  const endTime = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return Infinity;
  return Math.floor((endTime - startTime) / 86_400_000) + 1;
}

export function financialQuarterLabel(periodEnd: string) {
  const [year, month] = periodEnd.split("-").map(Number);
  return `${Math.ceil(month / 3)}T/${year}`;
}

export function parseCvmQuarterlyHistory(
  csv: string,
  cnpj: string
): CvmQuarterlyFinancialPoint[] {
  const rows = parseRows(csv, cnpj);
  const references = Array.from(new Set(rows.map(row => row.DT_REFER)));
  const points = new Map<string, CvmQuarterlyFinancialPoint>();
  for (const reference of references) {
    const referenceRows = rows.filter(row => row.DT_REFER === reference);
    const version = referenceRows.reduce(
      (latest, row) => Math.max(latest, Number(row.VERSAO) || 0),
      0
    );
    const versionRows = referenceRows.filter(row => Number(row.VERSAO) === version);
    for (const order of ["ULTIMO", "PENULTIMO"] as const) {
      const ordered = rowsByOrder(versionRows, order);
      const revenueRows = ordered.filter(row => row.CD_CONTA === "3.01");
      if (!revenueRows.length) continue;
      const revenueRow = revenueRows.reduce((latestStart, row) =>
        row.DT_INI_EXERC > latestStart.DT_INI_EXERC ? row : latestStart
      );
      if (daysBetween(revenueRow.DT_INI_EXERC, revenueRow.DT_FIM_EXERC) > 120)
        continue;
      const revenue = scaleToBrl(revenueRow.VL_CONTA, revenueRow.ESCALA_MOEDA);
      if (revenue === null) continue;
      const incomeRow = ordered.find(
        row =>
          row.CD_CONTA === "3.11" &&
          row.DT_INI_EXERC === revenueRow.DT_INI_EXERC &&
          row.DT_FIM_EXERC === revenueRow.DT_FIM_EXERC
      );
      const netIncome = incomeRow
        ? scaleToBrl(incomeRow.VL_CONTA, incomeRow.ESCALA_MOEDA)
        : null;
      const netMargin =
        netIncome !== null && revenue !== 0 ? (netIncome / revenue) * 100 : null;
      points.set(revenueRow.DT_FIM_EXERC, {
        label: financialQuarterLabel(revenueRow.DT_FIM_EXERC),
        periodStart: revenueRow.DT_INI_EXERC,
        periodEnd: revenueRow.DT_FIM_EXERC,
        revenue,
        netIncome,
        netMargin,
        source: "cvm",
      });
    }
  }
  return Array.from(points.values())
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd))
    .slice(-8);
}

export function parseCvmFinancialStatements(input: {
  ticker: string;
  cnpj: string;
  filing: FilingKind;
  csv: Record<StatementKind, string>;
  asOf?: string;
}): CvmFinancialStatements | null {
  const byStatement = {
    BPA: selectLatestVersionRows(parseRows(input.csv.BPA, input.cnpj)),
    BPP: selectLatestVersionRows(parseRows(input.csv.BPP, input.cnpj)),
    DRE: selectLatestVersionRows(parseRows(input.csv.DRE, input.cnpj)),
  };
  const allRows = [...byStatement.BPA, ...byStatement.BPP, ...byStatement.DRE];
  if (!allRows.length) return null;
  const referenceDate = allRows.reduce(
    (latest, row) => (row.DT_REFER > latest ? row.DT_REFER : latest),
    ""
  );
  const rowsAtReference = {
    BPA: rowsByOrder(
      byStatement.BPA.filter(row => row.DT_REFER === referenceDate),
      "ULTIMO"
    ),
    BPP: rowsByOrder(
      byStatement.BPP.filter(row => row.DT_REFER === referenceDate),
      "ULTIMO"
    ),
    DRE: rowsByOrder(
      byStatement.DRE.filter(row => row.DT_REFER === referenceDate),
      "ULTIMO"
    ),
  };
  const comparativeRows = {
    BPA: rowsByOrder(
      byStatement.BPA.filter(row => row.DT_REFER === referenceDate),
      "PENULTIMO"
    ),
    BPP: rowsByOrder(
      byStatement.BPP.filter(row => row.DT_REFER === referenceDate),
      "PENULTIMO"
    ),
    DRE: rowsByOrder(
      byStatement.DRE.filter(row => row.DT_REFER === referenceDate),
      "PENULTIMO"
    ),
  };
  const identity = allRows.find(row => row.DT_REFER === referenceDate)!;
  const drePeriod = rowsAtReference.DRE.reduce<CsvRecord | null>(
    (earliest, row) =>
      !earliest || row.DT_INI_EXERC < earliest.DT_INI_EXERC ? row : earliest,
    null
  );
  return {
    ticker: input.ticker.toUpperCase(),
    cnpj: input.cnpj,
    cvmCode: identity.CD_CVM,
    companyName: identity.DENOM_CIA,
    filing: input.filing,
    referenceDate,
    periodStart: drePeriod?.DT_INI_EXERC ?? referenceDate,
    periodEnd: drePeriod?.DT_FIM_EXERC ?? referenceDate,
    version: Number(identity.VERSAO) || 0,
    currency: "BRL",
    values: {
      revenue: accountValue(rowsAtReference.DRE, "3.01"),
      netIncome: accountValue(rowsAtReference.DRE, "3.11"),
      totalAssets: accountValue(rowsAtReference.BPA, "1"),
      equity: accountValue(rowsAtReference.BPP, "2.03"),
    },
    comparatives: {
      revenue: accountValue(comparativeRows.DRE, "3.01"),
      netIncome: accountValue(comparativeRows.DRE, "3.11"),
      totalAssets: accountValue(comparativeRows.BPA, "1"),
      equity: accountValue(comparativeRows.BPP, "2.03"),
    },
    quarterlyHistory: parseCvmQuarterlyHistory(input.csv.DRE, input.cnpj),
    source: "cvm",
    sourceUrl: `https://dados.cvm.gov.br/dataset/cia_aberta-doc-${input.filing.toLowerCase()}`,
    asOf: input.asOf ?? new Date().toISOString(),
  };
}

function entryName(filing: FilingKind, statement: StatementKind, year: number) {
  return `${filing.toLowerCase()}_cia_aberta_${statement}_con_${year}.csv`;
}

function extractTargetsCsv(
  zipBytes: Uint8Array,
  name: string,
  cnpjs: Set<string>
) {
  const entries = unzipSync(zipBytes, { filter: file => file.name === name });
  const entry = entries[name];
  if (!entry || entry.byteLength > MAX_STATEMENT_BYTES) return new Map<string, string>();
  const text = new TextDecoder("windows-1252").decode(entry);
  const lines = text.split(/\r?\n/);
  const header = lines[0] ?? "";
  const grouped = new Map<string, string[]>();
  for (const line of lines.slice(1)) {
    const separator = line.indexOf(";");
    if (separator < 0) continue;
    const cnpj = line.slice(0, separator);
    if (!cnpjs.has(cnpj)) continue;
    const group = grouped.get(cnpj) ?? [];
    group.push(line);
    grouped.set(cnpj, group);
  }
  return new Map(
    Array.from(grouped.entries()).map(([cnpj, companyRows]) => [
      cnpj,
      [header, ...companyRows].join("\n"),
    ])
  );
}

async function fetchFilingTargets(
  targets: Array<{ ticker: string; cnpj: string }>,
  filing: FilingKind,
  year: number
) {
  const lower = filing.toLowerCase();
  const url = `${CVM_DATA_ROOT}/${filing}/DADOS/${lower}_cia_aberta_${year}.zip`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
    headers: { Accept: "application/zip" },
  });
  if (!response.ok) return new Map<string, CvmFinancialStatements>();
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_ZIP_BYTES)
    return new Map<string, CvmFinancialStatements>();
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_ZIP_BYTES)
    return new Map<string, CvmFinancialStatements>();
  const cnpjs = new Set(targets.map(target => target.cnpj));
  const extracted = Object.fromEntries(
    (["BPA", "BPP", "DRE"] as StatementKind[]).map(statement => [
      statement,
      extractTargetsCsv(bytes, entryName(filing, statement, year), cnpjs),
    ])
  ) as Record<StatementKind, Map<string, string>>;
  const asOf = response.headers.get("last-modified") ?? new Date().toISOString();
  const results = new Map<string, CvmFinancialStatements>();
  for (const target of targets) {
    const csv = Object.fromEntries(
      (["BPA", "BPP", "DRE"] as StatementKind[]).map(statement => [
        statement,
        extracted[statement].get(target.cnpj) ?? "",
      ])
    ) as Record<StatementKind, string>;
    if (Object.values(csv).some(value => !value)) continue;
    const parsed = parseCvmFinancialStatements({ ...target, filing, csv, asOf });
    if (parsed) results.set(target.cnpj, parsed);
  }
  return results;
}

async function loadLatest(ticker: string, cnpj: string) {
  const result = await loadLatestBatch([{ ticker, cnpj }]);
  return result.get(cnpj) ?? null;
}

async function loadLatestBatch(targets: Array<{ ticker: string; cnpj: string }>) {
  const year = new Date().getUTCFullYear();
  const results = new Map<string, CvmFinancialStatements>();
  for (const [filing, candidateYear] of [
    ["ITR", year],
    ["ITR", year - 1],
    ["DFP", year - 1],
    ["DFP", year - 2],
  ] as const) {
    const unresolved = targets.filter(target => !results.has(target.cnpj));
    if (!unresolved.length) break;
    try {
      const filingResults = await fetchFilingTargets(
        unresolved,
        filing,
        candidateYear
      );
      for (const [targetCnpj, value] of Array.from(filingResults.entries()))
        results.set(targetCnpj, value);
    } catch (error) {
      logger.warn("cvm-financials-filing-unavailable", {
        filing,
        year: candidateYear,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message }
            : error,
      });
    }
  }
  return results;
}

export async function fetchCvmFinancialStatementsBatch(
  targets: Array<{ ticker: string; cnpj: string }>
) {
  const uniqueTargets = Array.from(
    new Map(targets.map(target => [target.cnpj, target])).values()
  );
  const results = await loadLatestBatch(uniqueTargets);
  for (const target of uniqueTargets) {
    const value = results.get(target.cnpj) ?? null;
    cache.set(`${target.ticker.toUpperCase()}:${target.cnpj}`, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      value,
    });
  }
  return results;
}

export async function fetchCvmFinancialStatements(ticker: string, cnpj: string) {
  const key = `${ticker.toUpperCase()}:${cnpj}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const pending = inFlight.get(key);
  if (pending) return pending;
  const request = loadLatest(ticker, cnpj)
    .then(value => {
      cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
      return value;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}
