export type EditorialCategory =
  | "Mercado"
  | "Empresas"
  | "Macro"
  | "Regulação"
  | "Cripto"
  | "Proventos";

const tickerPatterns: Array<[string, RegExp]> = [
  ["ABEV3", /\b(?:ABEV3|Ambev)\b/i],
  ["B3SA3", /\b(?:B3SA3|B3 S\.?A\.?)\b/i],
  ["BBAS3", /\b(?:BBAS3|Banco do Brasil)\b/i],
  ["BTLG11", /\b(?:BTLG11|BTG Pactual Logística)\b/i],
  ["HGLG11", /\b(?:HGLG11|CSHG Logística)\b/i],
  ["ITUB4", /\b(?:ITUB4|Itaú Unibanco)\b/i],
  ["IVVB11", /\b(?:IVVB11|iShares S&P 500)\b/i],
  ["KNRI11", /\b(?:KNRI11|Kinea Renda Imobiliária)\b/i],
  ["MGLU3", /\b(?:MGLU3|Magazine Luiza|Magalu)\b/i],
  ["MXRF11", /\b(?:MXRF11|Maxi Renda)\b/i],
  ["PETR4", /\b(?:PETR4|Petrobras)\b/i],
  ["RENT3", /\b(?:RENT3|Localiza)\b/i],
  ["VALE3", /\bVALE3\b|\bVale S\.?A\.?\b/i],
  ["WEGE3", /\b(?:WEGE3|WEG S\.?A\.?)\b/i],
  ["XPML11", /\b(?:XPML11|XP Malls)\b/i],
  ["BTC/USD", /\b(?:BTC\/USD|Bitcoin)\b/i],
  ["ETH/USD", /\b(?:ETH\/USD|Ethereum)\b/i],
  ["SOL/USD", /\b(?:SOL\/USD|Solana)\b/i],
];

export function identifyRelatedTickers(text: string) {
  return tickerPatterns
    .filter(([, pattern]) => pattern.test(text))
    .map(([ticker]) => ticker);
}

export function classifyEditorialItem(input: {
  text: string;
  source: string;
  relatedTickers?: string[];
}): EditorialCategory {
  if (input.source === "cvm") return "Regulação";
  if (input.source === "ibge") return "Macro";
  if (input.source === "bcb")
    return /\b(regulaç|resoluç|norma|normativo|supervisão|autorização)\w*/i.test(
      input.text
    )
      ? "Regulação"
      : "Macro";
  if (/\b(dividendo|dividendos|provento|proventos|juros sobre capital|JCP)\b/i.test(input.text))
    return "Proventos";
  if (/\b(bitcoin|ethereum|solana|criptoativo|criptomoeda|tokenizaç)\w*/i.test(input.text))
    return "Cripto";
  if (/\b(selic|copom|ipca|inflaç|pib|câmbio|dólar|juros|fiscal|emprego|desemprego|balança comercial|dívida pública)\w*/i.test(input.text))
    return "Macro";
  if (
    input.relatedTickers?.length ||
    /\b(empresa|companhia|acionista|recuperação judicial|fusão|aquisição)\w*/i.test(input.text)
  )
    return "Empresas";
  return "Mercado";
}
