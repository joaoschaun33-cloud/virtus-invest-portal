import { unzipSync } from "fflate";
import { parseDelimitedLine } from "./delimitedText";
import { identifyRelatedTickers } from "./newsEnrichment";
import type { OfficialNewsItem } from "./officialNews";

const DATA_ROOT =
  "https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/IPE/DADOS";
const DATASET_URL = "https://dados.cvm.gov.br/dataset/cia_aberta-doc-ipe";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_ZIP_BYTES = 8_000_000;
const MAX_CSV_BYTES = 30_000_000;
const MAX_EVENT_AGE_DAYS = 45;

type CsvRecord = Record<string, string>;
let cache: { expiresAt: number; items: OfficialNewsItem[] } | null = null;

const benefitTerms =
  /\b(dividendo|dividendos|provento|proventos|juros sobre (?:o )?capital|JCP|bonificaç|restituiç(?:ão|ões) de capital|amortizaç)\w*/i;

function approvedDocumentUrl(value: string) {
  try {
    const url = new URL(value.replace(/^http:/i, "https:"));
    return url.protocol === "https:" && url.hostname === "www.rad.cvm.gov.br"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function decodeCsv(zipBytes: Uint8Array, year: number) {
  const expected = `ipe_cia_aberta_${year}.csv`;
  const entries = unzipSync(zipBytes, {
    filter: file => file.name.toLowerCase() === expected,
  });
  const bytes = entries[expected];
  if (!bytes || bytes.byteLength > MAX_CSV_BYTES) return null;
  return new TextDecoder("windows-1252").decode(bytes);
}

export function parseCvmCorporateEvents(
  csv: string,
  now = new Date()
): OfficialNewsItem[] {
  const lines = csv.split(/\r?\n/);
  const headers = parseDelimitedLine(lines[0] ?? "");
  const oldest = now.valueOf() - MAX_EVENT_AGE_DAYS * 86_400_000;
  const items = lines.slice(1).flatMap(line => {
    if (!line || !benefitTerms.test(line)) return [];
    const values = parseDelimitedLine(line);
    const row = Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""])
    ) as CsvRecord;
    const deliveredAt = new Date(`${row.Data_Entrega}T12:00:00-03:00`);
    const url = approvedDocumentUrl(row.Link_Download);
    const context = `${row.Categoria} ${row.Tipo} ${row.Especie} ${row.Assunto}`;
    if (
      !row.Nome_Companhia ||
      !url ||
      Number.isNaN(deliveredAt.valueOf()) ||
      deliveredAt.valueOf() < oldest ||
      deliveredAt.valueOf() > now.valueOf() + 86_400_000 ||
      !benefitTerms.test(context)
    )
      return [];
    const relatedTickers = identifyRelatedTickers(
      `${row.Nome_Companhia} ${row.Assunto}`
    );
    if (!relatedTickers.length) return [];
    const subject = row.Assunto || row.Tipo || row.Categoria;
    return [{
      headline: `${row.Nome_Companhia}: ${subject}`.slice(0, 240),
      summary: `Documento oficial entregue à CVM em ${row.Data_Entrega}. Consulte o anúncio original para valores, datas e condições.`.slice(0, 600),
      sourceName: "CVM — Empresas" as const,
      url,
      publishedAt: deliveredAt,
      category: "Proventos" as const,
      source: "cvm-ipe" as const,
      relatedTickers,
    }];
  });
  return Array.from(new Map(items.map(item => [item.url, item])).values())
    .sort((a, b) => b.publishedAt.valueOf() - a.publishedAt.valueOf())
    .slice(0, 12);
}

async function fetchYear(year: number) {
  try {
    const response = await fetch(`${DATA_ROOT}/ipe_cia_aberta_${year}.zip`, {
      signal: AbortSignal.timeout(12_000),
      headers: { Accept: "application/zip, application/octet-stream" },
    });
    if (!response.ok) return [];
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > MAX_ZIP_BYTES) return [];
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_ZIP_BYTES) return [];
    const csv = decodeCsv(bytes, year);
    return csv ? parseCvmCorporateEvents(csv) : [];
  } catch (error) {
    console.warn("[Editorial] CVM corporate events unavailable", error);
    return [];
  }
}

export async function fetchCvmCorporateEvents() {
  if (cache && cache.expiresAt > Date.now()) return cache.items;
  const year = new Date().getFullYear();
  let items = await fetchYear(year);
  if (!items.length) items = await fetchYear(year - 1);
  cache = { expiresAt: Date.now() + CACHE_TTL_MS, items };
  return items;
}

export const CVM_CORPORATE_EVENTS_SOURCE = DATASET_URL;
