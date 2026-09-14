import {
  classifyEditorialItem,
  identifyRelatedTickers,
  type EditorialCategory,
} from "./newsEnrichment";
import { fetchCvmCorporateEvents } from "./cvmCorporateEvents";
import { logger } from "./_core/logger";

export type OfficialNewsItem = {
  headline: string;
  summary: string;
  sourceName:
    | "Agência Brasil"
    | "Banco Central"
    | "IBGE"
    | "CVM"
    | "CVM — Empresas";
  url: string;
  publishedAt: Date;
  category: EditorialCategory;
  source: "agencia-brasil" | "bcb" | "ibge" | "cvm" | "cvm-ipe";
  relatedTickers: string[];
};

type FeedDefinition = {
  url: string;
  sourceName: OfficialNewsItem["sourceName"];
  source: OfficialNewsItem["source"];
  category: OfficialNewsItem["category"];
  approvedHosts: string[];
  fallbackSummary: string;
  maxItems: number;
  format?: "rss" | "atom";
};

const FEEDS: FeedDefinition[] = [
  {
    url: "https://agenciabrasil.ebc.com.br/rss/economia/feed.xml",
    sourceName: "Agência Brasil",
    source: "agencia-brasil",
    category: "Mercado",
    approvedHosts: ["agenciabrasil.ebc.com.br"],
    fallbackSummary: "Notícia econômica publicada pela Agência Brasil.",
    maxItems: 20,
  },
  {
    url: "https://www.bcb.gov.br/api/feed/sitebcb/sitefeeds/noticias",
    sourceName: "Banco Central",
    source: "bcb",
    category: "Macro",
    approvedHosts: ["www.bcb.gov.br"],
    fallbackSummary: "Comunicado oficial publicado pelo Banco Central do Brasil.",
    maxItems: 40,
    format: "atom",
  },
  {
    url: "https://agenciadenoticias.ibge.gov.br/agencia-rss",
    sourceName: "IBGE",
    source: "ibge",
    category: "Macro",
    approvedHosts: ["agenciadenoticias.ibge.gov.br"],
    fallbackSummary: "Divulgação estatística publicada pelo IBGE.",
    maxItems: 30,
  },
  {
    url: "https://www.gov.br/cvm/pt-br/assuntos/noticias/2026/rss.xml",
    sourceName: "CVM",
    source: "cvm",
    category: "Regulação",
    approvedHosts: ["www.gov.br"],
    fallbackSummary: "Notícia regulatória publicada pela CVM.",
    maxItems: 100,
  },
];

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_FEED_BYTES = 2_000_000;
let cache: { expiresAt: number; items: OfficialNewsItem[] } | null = null;

function decodeEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/&#x([\da-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function plainTextFromFeed(value: string) {
  let decoded = value.replace(/^<!\[CDATA\[|\]\]>$/g, "");
  decoded = decodeEntities(decodeEntities(decoded));
  return decoded
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

function decodeXml(value: string) {
  return plainTextFromFeed(value);
}

function element(block: string, tag: string) {
  const match = block.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i")
  );
  return match ? decodeXml(match[1]) : "";
}

function attribute(block: string, tag: string, name: string) {
  const match = block.match(
    new RegExp(`<${tag}\\b[^>]*\\b${name}=["']([^"']+)["'][^>]*>`, "i")
  );
  return match ? decodeXml(match[1]) : "";
}

function approvedUrl(value: string, approvedHosts: string[]) {
  try {
    const parsed = new URL(value.replace(/^http:/i, "https:"));
    return parsed.protocol === "https:" &&
      approvedHosts.includes(parsed.hostname)
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

export function parseOfficialFeed(
  xml: string,
  definition: FeedDefinition
): OfficialNewsItem[] {
  return Array.from(xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi))
    .slice(0, definition.maxItems)
    .flatMap(match => {
      const block = match[1];
      const headline = element(block, "title").slice(0, 240);
      const summary = element(block, "description").slice(0, 600);
      const url = approvedUrl(
        element(block, "link") || element(block, "guid"),
        definition.approvedHosts
      );
      const publishedAt = new Date(element(block, "pubDate"));
      if (!headline || !url || Number.isNaN(publishedAt.valueOf())) return [];
      const resolvedSummary = summary || definition.fallbackSummary;
      const relatedTickers = identifyRelatedTickers(
        `${headline} ${resolvedSummary}`
      );
      return [
        {
          headline,
          summary: resolvedSummary,
          sourceName: definition.sourceName,
          url,
          publishedAt,
          category: classifyEditorialItem({
            text: `${headline} ${resolvedSummary}`,
            source: definition.source,
            relatedTickers,
          }),
          source: definition.source,
          relatedTickers,
        },
      ];
    });
}

export function parseAgenciaBrasilFeed(xml: string) {
  return parseOfficialFeed(xml, FEEDS[0]);
}

export function parseOfficialAtomFeed(
  xml: string,
  definition: FeedDefinition
): OfficialNewsItem[] {
  return Array.from(xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi))
    .slice(0, definition.maxItems)
    .flatMap(match => {
      const block = match[1];
      const headline = element(block, "title").slice(0, 240);
      const summary = (
        element(block, "summary") || element(block, "content")
      ).slice(0, 600);
      const url = approvedUrl(
        attribute(block, "link", "href") || element(block, "id"),
        definition.approvedHosts
      );
      const publishedAt = new Date(
        element(block, "published") || element(block, "updated")
      );
      if (!headline || !url || Number.isNaN(publishedAt.valueOf())) return [];
      const resolvedSummary = summary || definition.fallbackSummary;
      const relatedTickers = identifyRelatedTickers(
        `${headline} ${resolvedSummary}`
      );
      return [{
        headline,
        summary: resolvedSummary,
        sourceName: definition.sourceName,
        url,
        publishedAt,
        category: classifyEditorialItem({
          text: `${headline} ${resolvedSummary}`,
          source: definition.source,
          relatedTickers,
        }),
        source: definition.source,
        relatedTickers,
      }];
    });
}

const marketTerms =
  /\b(selic|copom|inflaç|ipca|igp|pib|dólar|câmbio|juros|crédito|banco|mercado|bolsa|ações|invest|fundo|tesouro|dívida|fiscal|arrecada|emprego|indústria|comércio|exporta|importa|balança|petrobras|petróleo|energia|economia|financeir)\w*/i;

const institutionalNoise =
  /\b(estágio|estagiári|concurso|processo seletivo|inscriç(?:ão|ões)|vaga|seminário|webinário|prêmio|homenagem|expediente|feriado)\w*/i;

const centralBankHeadlineTerms =
  /\b(copom|selic|inflaç|juros|câmbio|crédito|pix|open finance|sistema financeiro|pagamento|transferência|ativo virtual|supervisão|regulaç|resoluç|instituição financeira|economia|financeir|título de crédito|focus)\w*/i;

function prioritizeMarketNews(items: OfficialNewsItem[]) {
  const relevant = items.filter(
    item =>
      (item.source === "cvm" ||
        item.source === "cvm-ipe" ||
        (item.source === "bcb"
          ? centralBankHeadlineTerms.test(item.headline)
          : marketTerms.test(`${item.headline} ${item.summary}`))) &&
      !(item.source === "bcb" && institutionalNoise.test(item.headline))
  );
  const quotas: Record<OfficialNewsItem["source"], number> = {
    "agencia-brasil": 10,
    bcb: 6,
    ibge: 6,
    cvm: 8,
    "cvm-ipe": 6,
  };
  const balanced = (Object.keys(quotas) as OfficialNewsItem["source"][])
    .flatMap(source =>
      relevant
        .filter(item => item.source === source)
        .sort((left, right) => right.publishedAt.valueOf() - left.publishedAt.valueOf())
        .slice(0, quotas[source])
    );
  return balanced
    .sort(
      (left, right) => right.publishedAt.valueOf() - left.publishedAt.valueOf()
    )
    .slice(0, 36);
}

async function fetchFeed(definition: FeedDefinition) {
  try {
    const response = await fetch(definition.url, {
      headers: { Accept: "application/rss+xml, application/xml;q=0.9" },
      signal: AbortSignal.timeout(6_000),
    });
    if (!response.ok) return [];
    const finalHost = new URL(response.url).hostname;
    if (
      !definition.approvedHosts.includes(finalHost) &&
      finalHost !== new URL(definition.url).hostname
    )
      return [];
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_FEED_BYTES) return [];
    const xml = await response.text();
    if (xml.length > MAX_FEED_BYTES) return [];
    return definition.format === "atom"
      ? parseOfficialAtomFeed(xml, definition)
      : parseOfficialFeed(xml, definition);
  } catch (error) {
    logger.warn("editorial-official-feed-unavailable", {
      sourceName: definition.sourceName,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : error,
    });
    return [];
  }
}

export async function fetchOfficialNews() {
  if (cache && cache.expiresAt > Date.now()) return cache.items;
  const settled = await Promise.all([
    ...FEEDS.map(fetchFeed),
    fetchCvmCorporateEvents(),
  ]);
  const deduplicated = Array.from(
    new Map(settled.flat().map(item => [item.url, item])).values()
  );
  const items = prioritizeMarketNews(deduplicated);
  cache = { expiresAt: Date.now() + CACHE_TTL_MS, items };
  return items;
}
