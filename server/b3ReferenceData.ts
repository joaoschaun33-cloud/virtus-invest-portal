import { unzipSync } from "fflate";
import { parseDelimitedLine } from "./delimitedText";
import { logger } from "./_core/logger";

const B3_ISIN_API =
  "https://sistemaswebb3-listados.b3.com.br/isinProxy/IsinCall";
const B3_ISIN_PAGE =
  "https://sistemaswebb3-listados.b3.com.br/isinPage/?language=pt-br";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ZIP_BYTES = 12_000_000;
const MAX_ISSUER_BYTES = 15_000_000;

type DownloadIndex = {
  geralPt?: { id?: number; dataGeracao?: string };
};

export type B3IssuerIdentity = {
  ticker: string;
  issuerCode: string;
  legalName: string;
  cnpj: string;
  referenceDate: string;
  source: "b3";
  sourceUrl: string;
  asOf: string;
};

let cache: { expiresAt: number; issuerText: string; asOf: string } | null =
  null;

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCnpj(value: string) {
  const digits = onlyDigits(value);
  if (digits.length !== 14) return value;
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

export function findB3IssuerInText(
  issuerText: string,
  ticker: string,
  assetType: string,
  asOf = new Date().toISOString()
): B3IssuerIdentity | null {
  if (assetType.toUpperCase() !== "STOCK") return null;
  const issuerCode = ticker.toUpperCase().match(/^[A-Z]{4}/)?.[0];
  if (!issuerCode) return null;
  const line = issuerText
    .split(/\r?\n/)
    .find(candidate => candidate.startsWith(`"${issuerCode}",`));
  if (!line) return null;
  const [code, legalName, rawCnpj, referenceDate] = parseDelimitedLine(
    line,
    ","
  );
  if (!code || !legalName || onlyDigits(rawCnpj).length !== 14) return null;
  return {
    ticker: ticker.toUpperCase(),
    issuerCode: code,
    legalName,
    cnpj: formatCnpj(rawCnpj),
    referenceDate,
    source: "b3",
    sourceUrl: B3_ISIN_PAGE,
    asOf,
  };
}

function decodeIssuerFile(zipBytes: Uint8Array) {
  const entries = unzipSync(zipBytes, {
    filter: file => file.name.toUpperCase() === "EMISSOR.TXT",
  });
  const issuer = Object.entries(entries).find(
    ([name]) => name.toUpperCase() === "EMISSOR.TXT"
  )?.[1];
  if (!issuer || issuer.byteLength > MAX_ISSUER_BYTES) return null;
  return new TextDecoder("windows-1252").decode(issuer);
}

async function fetchIssuerText() {
  if (cache && cache.expiresAt > Date.now()) return cache;
  try {
    const indexResponse = await fetch(`${B3_ISIN_API}/GetTextDownload/`, {
      signal: AbortSignal.timeout(8_000),
      headers: { Accept: "application/json" },
    });
    if (!indexResponse.ok) {
      logger.warn("b3-reference-download-index-failed", {
        status: indexResponse.status,
      });
      return null;
    }
    const rawIndex = await indexResponse.json();
    const index = (
      typeof rawIndex === "string" ? JSON.parse(rawIndex) : rawIndex
    ) as DownloadIndex;
    const id = Number(index.geralPt?.id);
    if (!Number.isSafeInteger(id)) {
      logger.warn("b3-reference-download-index-invalid");
      return null;
    }
    const encodedId = Buffer.from(JSON.stringify(id)).toString("base64");
    const fileResponse = await fetch(
      `${B3_ISIN_API}/GetFileDownload/${encodedId}`,
      {
        signal: AbortSignal.timeout(15_000),
        headers: { Accept: "application/octet-stream" },
      }
    );
    if (!fileResponse.ok) {
      logger.warn("b3-reference-issuer-file-failed", {
        status: fileResponse.status,
      });
      return null;
    }
    const declaredLength = Number(
      fileResponse.headers.get("content-length") ?? 0
    );
    if (declaredLength > MAX_ZIP_BYTES) {
      logger.warn("b3-reference-issuer-zip-too-large", {
        declaredLength,
        maxBytes: MAX_ZIP_BYTES,
      });
      return null;
    }
    const bytes = new Uint8Array(await fileResponse.arrayBuffer());
    if (bytes.byteLength > MAX_ZIP_BYTES) {
      logger.warn("b3-reference-issuer-zip-too-large", {
        actualLength: bytes.byteLength,
        maxBytes: MAX_ZIP_BYTES,
      });
      return null;
    }
    const issuerText = decodeIssuerFile(bytes);
    if (!issuerText) {
      logger.warn("b3-reference-issuer-file-invalid");
      return null;
    }
    const asOf = index.geralPt?.dataGeracao ?? new Date().toISOString();
    cache = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      issuerText,
      asOf,
    };
    return cache;
  } catch (error) {
    logger.warn("b3-reference-issuer-source-unavailable", {
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : error,
    });
    return null;
  }
}

export async function fetchB3IssuerIdentity(ticker: string, assetType: string) {
  if (assetType.toUpperCase() !== "STOCK") return null;
  const snapshot = await fetchIssuerText();
  return snapshot
    ? findB3IssuerInText(snapshot.issuerText, ticker, assetType, snapshot.asOf)
    : null;
}
