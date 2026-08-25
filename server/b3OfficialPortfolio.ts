export type B3OfficialConstituent = {
  ticker: string;
  name: string;
  assetType: "STOCK" | "REIT";
  exchange: "B3";
  currency: "BRL";
  sector: string | null;
  index: "IBOV" | "IFIX";
};

export type B3OfficialPortfolio = {
  index: "IBOV" | "IFIX";
  referenceDate: string;
  constituents: B3OfficialConstituent[];
  sourceUrl: string;
};

const BASE_URL =
  "https://sistemaswebb3-listados.b3.com.br/indexProxy/indexCall/GetPortfolioDay";

function parseReferenceDate(value: unknown) {
  const match = String(value ?? "").match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!match) throw new Error("B3 retornou uma data de carteira inválida");
  return `20${match[3]}-${match[2]}-${match[1]}`;
}

export function parseB3OfficialPortfolio(
  index: "IBOV" | "IFIX",
  payload: unknown,
  sourceUrl = BASE_URL
): B3OfficialPortfolio {
  const body = payload as {
    header?: { date?: unknown };
    page?: { totalRecords?: unknown };
    results?: Array<{ cod?: unknown; asset?: unknown }>;
  };
  const minimum = index === "IBOV" ? 60 : 70;
  const seen = new Set<string>();
  const constituents = (body.results ?? []).flatMap(row => {
    const ticker = String(row.cod ?? "").trim().toUpperCase();
    const name = String(row.asset ?? "").trim();
    if (!/^[A-Z0-9]{4,12}$/.test(ticker) || !name || seen.has(ticker)) return [];
    seen.add(ticker);
    return [{
      ticker,
      name,
      assetType: index === "IFIX" ? "REIT" as const : "STOCK" as const,
      exchange: "B3" as const,
      currency: "BRL" as const,
      sector: index === "IFIX" ? "Fundos imobiliários" : null,
      index,
    }];
  });
  if (constituents.length < minimum)
    throw new Error(`Carteira ${index} incompleta: ${constituents.length} componentes`);
  const declared = Number(body.page?.totalRecords ?? constituents.length);
  if (Number.isFinite(declared) && declared !== constituents.length)
    throw new Error(`Carteira ${index} truncada: ${constituents.length} de ${declared}`);
  return {
    index,
    referenceDate: parseReferenceDate(body.header?.date),
    constituents,
    sourceUrl,
  };
}

export async function fetchB3OfficialPortfolio(index: "IBOV" | "IFIX") {
  const request = {
    language: "pt-br",
    pageNumber: 1,
    pageSize: 200,
    index,
    segment: "1",
  };
  const encoded = Buffer.from(JSON.stringify(request), "utf8").toString("base64");
  const sourceUrl = `${BASE_URL}/${encoded}`;
  const response = await fetch(sourceUrl, {
    signal: AbortSignal.timeout(20_000),
    headers: {
      Accept: "application/json",
      Referer: `https://sistemaswebb3-listados.b3.com.br/indexPage/day/${index}`,
      "User-Agent": "VirtusMarketData/1.0",
    },
  });
  if (!response.ok) throw new Error(`B3 ${index} respondeu HTTP ${response.status}`);
  return parseB3OfficialPortfolio(index, await response.json(), sourceUrl);
}

export async function fetchCurrentB3Universe() {
  const portfolios = await Promise.all([
    fetchB3OfficialPortfolio("IBOV"),
    fetchB3OfficialPortfolio("IFIX"),
  ]);
  const byTicker = new Map<string, B3OfficialConstituent>();
  for (const portfolio of portfolios)
    for (const constituent of portfolio.constituents)
      byTicker.set(constituent.ticker, constituent);
  return {
    portfolios,
    constituents: Array.from(byTicker.values()),
    referenceDate: portfolios.map(item => item.referenceDate).sort().at(0)!,
  };
}
