import { parseDelimitedLine } from "./delimitedText";

const CVM_COMPANY_CSV_URL =
  "https://dados.cvm.gov.br/dados/CIA_ABERTA/CAD/DADOS/cad_cia_aberta.csv";
const CVM_DATASET_URL = "https://dados.cvm.gov.br/dataset/cia_aberta-cad";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CSV_BYTES = 3_000_000;

export type CvmIssuer = {
  ticker: string;
  cnpj: string;
  cvmCode: string;
  legalName: string;
  tradeName: string;
  registrationStatus: string;
  issuerStatus: string;
  sector: string;
  source: "cvm";
  sourceUrl: string;
  asOf: string;
};

let cache: { expiresAt: number; csv: string; fetchedAt: string } | null = null;

export function findCvmIssuerInCsv(
  csv: string,
  ticker: string,
  cnpj: string,
  asOf = new Date().toISOString()
): CvmIssuer | null {
  if (!/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(cnpj)) return null;
  const lines = csv.split(/\r?\n/);
  const headers = parseDelimitedLine(lines[0] ?? "");
  const candidates = lines
    .filter(line => line.startsWith(`${cnpj};`))
    .map(line => {
      const values = parseDelimitedLine(line);
      return Object.fromEntries(
        headers.map((header, index) => [header, values[index] ?? ""])
      );
    });
  const company =
    candidates.find(item => item.SIT.toUpperCase() === "ATIVO") ??
    candidates[0];
  if (!company?.CD_CVM || !company.DENOM_SOCIAL) return null;
  return {
    ticker: ticker.toUpperCase(),
    cnpj,
    cvmCode: company.CD_CVM,
    legalName: company.DENOM_SOCIAL,
    tradeName: company.DENOM_COMERC,
    registrationStatus: company.SIT,
    issuerStatus: company.SIT_EMISSOR,
    sector: company.SETOR_ATIV,
    source: "cvm",
    sourceUrl: CVM_DATASET_URL,
    asOf,
  };
}

async function fetchCvmCompanyCsv() {
  if (cache && cache.expiresAt > Date.now()) return cache;
  try {
    const response = await fetch(CVM_COMPANY_CSV_URL, {
      signal: AbortSignal.timeout(8_000),
      headers: { Accept: "text/csv" },
    });
    if (!response.ok) return null;
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_CSV_BYTES) return null;
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > MAX_CSV_BYTES) return null;
    const fetchedAt = new Date().toISOString();
    const csv = new TextDecoder("windows-1252").decode(bytes);
    cache = { expiresAt: Date.now() + CACHE_TTL_MS, csv, fetchedAt };
    return cache;
  } catch {
    return null;
  }
}

export async function fetchCvmIssuer(ticker: string, cnpj: string) {
  const snapshot = await fetchCvmCompanyCsv();
  return snapshot
    ? findCvmIssuerInCsv(snapshot.csv, ticker, cnpj, snapshot.fetchedAt)
    : null;
}
