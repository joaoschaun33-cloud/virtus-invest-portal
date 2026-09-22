export type DataSourceId =
  | "b3"
  | "cvm"
  | "bcb"
  | "ibge"
  | "tesouro-direto"
  | "agencia-brasil"
  | "brapi"
  | "twelve-data"
  | "finnhub"
  | "coingecko"
  | "eodhd"
  | "binance"
  | "virtus"
  | "catalog";

export type DataSourceKind =
  | "official"
  | "market-provider"
  | "editorial"
  | "derived"
  | "fallback";

export type DisplayPolicy = "allowed" | "license-review" | "internal-only";

export type DataSourceDefinition = {
  id: DataSourceId;
  name: string;
  kind: DataSourceKind;
  authority: "authoritative" | "operational" | "derived" | "fallback";
  displayPolicy: DisplayPolicy;
  scope: string;
  website: string;
};

/**
 * Public, non-secret source catalog. This is the single vocabulary used by the
 * server policy and the transparency UI; credentials never belong here.
 */
export const DATA_SOURCES = {
  b3: {
    id: "b3",
    name: "B3",
    kind: "official",
    authority: "authoritative",
    displayPolicy: "allowed",
    scope: "Identidade de emissores; instrumentos e fechamento em expansão",
    website: "https://www.b3.com.br/",
  },
  cvm: {
    id: "cvm",
    name: "CVM",
    kind: "official",
    authority: "authoritative",
    displayPolicy: "allowed",
    scope: "Demonstrações, cadastros e documentos regulatórios",
    website: "https://dados.cvm.gov.br/",
  },
  bcb: {
    id: "bcb",
    name: "Banco Central do Brasil",
    kind: "official",
    authority: "authoritative",
    displayPolicy: "allowed",
    scope: "Selic, câmbio, séries monetárias e Copom",
    website: "https://www.bcb.gov.br/",
  },
  ibge: {
    id: "ibge",
    name: "IBGE",
    kind: "official",
    authority: "authoritative",
    displayPolicy: "allowed",
    scope: "Inflação, atividade econômica, emprego e calendário",
    website: "https://www.ibge.gov.br/",
  },
  "tesouro-direto": {
    id: "tesouro-direto",
    name: "Tesouro Direto",
    kind: "official",
    authority: "authoritative",
    displayPolicy: "allowed",
    scope: "Preços, taxas, vencimentos e histórico de títulos públicos",
    website: "https://www.tesourodireto.com.br/",
  },
  "agencia-brasil": {
    id: "agencia-brasil",
    name: "Agência Brasil",
    kind: "editorial",
    authority: "authoritative",
    displayPolicy: "allowed",
    scope: "Noticiário econômico público com link para a publicação original",
    website: "https://agenciabrasil.ebc.com.br/",
  },
  brapi: {
    id: "brapi",
    name: "brapi",
    kind: "market-provider",
    authority: "operational",
    displayPolicy: "allowed",
    scope: "Cotações e histórico operacional de ativos brasileiros",
    website: "https://brapi.dev/",
  },
  "twelve-data": {
    id: "twelve-data",
    name: "Twelve Data",
    kind: "market-provider",
    authority: "operational",
    displayPolicy: "license-review",
    scope: "Mercados globais; exibição pública depende da licença contratada",
    website: "https://twelvedata.com/",
  },
  finnhub: {
    id: "finnhub",
    name: "Finnhub",
    kind: "market-provider",
    authority: "operational",
    displayPolicy: "license-review",
    scope:
      "Mercado internacional; exibição pública depende da licença contratada",
    website: "https://finnhub.io/",
  },
  coingecko: {
    id: "coingecko",
    name: "CoinGecko",
    kind: "market-provider",
    authority: "operational",
    displayPolicy: "license-review",
    scope:
      "Cotações, mercado e histórico de criptoativos; exibição pública requer plano/licença compatível",
    website: "https://www.coingecko.com/",
  },
  eodhd: {
    id: "eodhd",
    name: "EODHD",
    kind: "market-provider",
    authority: "operational",
    displayPolicy: "license-review",
    scope:
      "Cotações e histórico de mercados globais; fundamentos dependem do plano",
    website: "https://eodhd.com/",
  },
  binance: {
    id: "binance",
    name: "Binance",
    kind: "market-provider",
    authority: "operational",
    displayPolicy: "allowed",
    scope:
      "Cotações em tempo real e histórico de candlesticks (OHLCV) de criptoativos via API pública Spot",
    website: "https://www.binance.com/",
  },
  virtus: {
    id: "virtus",
    name: "Cálculo Virtus",
    kind: "derived",
    authority: "derived",
    displayPolicy: "allowed",
    scope: "Indicadores calculados a partir de fontes identificadas",
    website: "https://www.virtusinvestimentos.com.br/",
  },
  catalog: {
    id: "catalog",
    name: "Catálogo de referência",
    kind: "fallback",
    authority: "fallback",
    displayPolicy: "allowed",
    scope: "Conteúdo demonstrativo usado somente quando não há fonte válida",
    website: "https://www.virtusinvestimentos.com.br/",
  },
} as const satisfies Record<DataSourceId, DataSourceDefinition>;
