export type OfficialNewsItem = {
  headline: string;
  summary: string;
  sourceName: "Agência Brasil" | "CVM";
  url: string;
  publishedAt: Date;
  category: "Mercado" | "Regulação";
  source: "agencia-brasil" | "cvm";
};

type FeedDefinition = {
  url: string;
  sourceName: OfficialNewsItem["sourceName"];
  source: OfficialNewsItem["source"];
  category: OfficialNewsItem["category"];
  approvedHosts: string[];
  fallbackSummary: string;
  maxItems: number;
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

function decodeXml(value: string) {
  return value
    .replace(/^<!\[CDATA\[|\]\]>$/g, "")
    .replace(/<[^>]*>/g, " ")
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
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function element(block: string, tag: string) {
  const match = block.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i")
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
      return [
        {
          headline,
          summary: summary || definition.fallbackSummary,
          sourceName: definition.sourceName,
          url,
          publishedAt,
          category: definition.category,
          source: definition.source,
        },
      ];
    });
}

export function parseAgenciaBrasilFeed(xml: string) {
  return parseOfficialFeed(xml, FEEDS[0]);
}

const marketTerms =
  /\b(selic|copom|inflaç|ipca|igp|pib|dólar|câmbio|juros|crédito|banco|mercado|bolsa|ações|invest|fundo|tesouro|dívida|fiscal|arrecada|emprego|indústria|comércio|exporta|importa|balança|petrobras|petróleo|energia|economia|financeir)\w*/i;

function prioritizeMarketNews(items: OfficialNewsItem[]) {
  const agency = items.filter(item => item.source === "agencia-brasil");
  const relevant = agency.filter(item =>
    marketTerms.test(`${item.headline} ${item.summary}`)
  );
  const cvm = items.filter(item => item.source === "cvm");
  return [...relevant.slice(0, 12), ...cvm]
    .sort(
      (left, right) => right.publishedAt.valueOf() - left.publishedAt.valueOf()
    )
    .slice(0, 20);
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
    return parseOfficialFeed(xml, definition);
  } catch (error) {
    console.warn(
      `[Editorial] ${definition.sourceName} feed unavailable`,
      error
    );
    return [];
  }
}

export async function fetchOfficialNews() {
  if (cache && cache.expiresAt > Date.now()) return cache.items;
  const settled = await Promise.all(FEEDS.map(fetchFeed));
  const deduplicated = Array.from(
    new Map(settled.flat().map(item => [item.url, item])).values()
  );
  const items = prioritizeMarketNews(deduplicated);
  cache = { expiresAt: Date.now() + CACHE_TTL_MS, items };
  return items;
}
