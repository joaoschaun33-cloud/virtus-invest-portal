import { describe, expect, it } from "vitest";
import { buildAutomatedEditorialDraft, type EditorialAutomationSnapshot } from "./editorialAutomation";
import { createEditorialDraft } from "./editorialWorkflow";

const now = new Date("2026-08-27T15:00:00.000Z");
const snapshot: EditorialAutomationSnapshot = {
  now,
  assets: [
    { ticker: "IBOV", name: "Ibovespa", assetType: "INDEX", lastPrice: "174586.26", changePercent: "0.08", source: "b3", updatedAt: now },
    { ticker: "VALE3", name: "Vale", assetType: "STOCK", lastPrice: "77.13", changePercent: "2.80", source: "b3", updatedAt: now },
    { ticker: "PETR4", name: "Petrobras", assetType: "STOCK", lastPrice: "42.11", changePercent: "-4.94", source: "b3", updatedAt: now },
  ],
  events: [
    { title: "Divulgação do IPCA", eventDate: new Date("2026-08-28T10:00:00.000Z"), importance: "HIGH", sourceName: "IBGE" },
  ],
  macro: {
    source: "IBGE e Banco Central do Brasil",
    checkedAt: now,
    summary: "Contexto oficial.",
    indicators: [
      { id: "selic", label: "Selic", value: 15, unit: "percent", asOf: now, detail: "Taxa anualizada", source: "bcb", sourceLabel: "Banco Central do Brasil" },
      { id: "usdbrl", label: "Dólar · venda", value: 5.42, unit: "currency", asOf: now, detail: "Câmbio", source: "bcb", sourceLabel: "Banco Central do Brasil" },
    ],
  },
};

describe("editorial automation", () => {
  it("builds a sourced morning draft without prescriptive language", () => {
    const input = buildAutomatedEditorialDraft("morning", snapshot);
    const draft = createEditorialDraft(input);
    expect(draft.status).toBe("needs_review");
    expect(draft.body).toContain("Divulgação do IPCA");
    expect(draft.body).toContain("Dólar comercial");
  });

  it("describes intraday movement without inventing causality", () => {
    const input = buildAutomatedEditorialDraft("intraday", snapshot);
    const draft = createEditorialDraft(input);
    expect(draft.status).toBe("needs_review");
    expect(draft.body).toContain("VALE3");
    expect(draft.body).toContain("PETR4");
    expect(draft.body).toContain("não atribuímos causalidade");
  });

  it("blocks close drafts until today's official reference exists", () => {
    expect(() =>
      buildAutomatedEditorialDraft("close", {
        ...snapshot,
        assets: snapshot.assets.map(asset =>
          asset.ticker === "IBOV"
            ? { ...asset, updatedAt: new Date("2026-08-26T21:00:00.000Z") }
            : asset
        ),
      })
    ).toThrow("ainda não atualizado");
    expect(createEditorialDraft(buildAutomatedEditorialDraft("close", snapshot)).status).toBe(
      "needs_review"
    );
  });

  it("uses one idempotency key per slot and Bahia date", () => {
    expect(buildAutomatedEditorialDraft("intraday", snapshot).generationKey).toBe(
      "editorial:intraday:2026-08-27"
    );
  });
});
