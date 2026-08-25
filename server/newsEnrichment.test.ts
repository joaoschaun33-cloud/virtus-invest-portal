import { describe, expect, it } from "vitest";
import { classifyEditorialItem, identifyRelatedTickers } from "./newsEnrichment";

describe("news enrichment", () => {
  it("relaciona somente aliases inequívocos do universo monitorado", () => {
    expect(
      identifyRelatedTickers(
        "Banco do Brasil lança aplicativo; Petrobras mantém investimentos"
      )
    ).toEqual(["BBAS3", "PETR4"]);
    expect(identifyRelatedTickers("A inflação vale atenção")).toEqual([]);
  });

  it("prioriza regulação, proventos, cripto, macro e empresas", () => {
    expect(classifyEditorialItem({ text: "Ofício circular", source: "cvm" })).toBe("Regulação");
    expect(classifyEditorialItem({ text: "Pagamento de dividendos", source: "agencia-brasil" })).toBe("Proventos");
    expect(classifyEditorialItem({ text: "Mercado de bitcoin", source: "agencia-brasil" })).toBe("Cripto");
    expect(classifyEditorialItem({ text: "Copom mantém a Selic", source: "agencia-brasil" })).toBe("Macro");
    expect(classifyEditorialItem({ text: "Novo aplicativo bancário", source: "agencia-brasil", relatedTickers: ["BBAS3"] })).toBe("Empresas");
    expect(classifyEditorialItem({ text: "Produção industrial recua", source: "ibge" })).toBe("Macro");
    expect(classifyEditorialItem({ text: "BC publica nova resolução", source: "bcb" })).toBe("Regulação");
  });
});
