import { describe, expect, it } from "vitest";
import { normalizeProviderNewsItem } from "./marketProviders";

describe("provider news normalization", () => {
  it("rejects missing, non-HTTPS, and invalid-date items", () => {
    expect(
      normalizeProviderNewsItem(
        { headline: "Sem URL", datetime: 1_755_000_000 },
        "finnhub",
        "PETR4"
      )
    ).toBeNull();
    expect(
      normalizeProviderNewsItem(
        { headline: "URL insegura", url: "http://example.com", datetime: 1_755_000_000 },
        "finnhub",
        "PETR4"
      )
    ).toBeNull();
    expect(
      normalizeProviderNewsItem(
        { headline: "Data inválida", url: "https://example.com", datetime: "invalid" },
        "finnhub",
        "PETR4"
      )
    ).toBeNull();
  });

  it("normalizes valid metadata and bounds text length", () => {
    const result = normalizeProviderNewsItem(
      {
        headline: `  ${"A".repeat(300)}  `,
        summary: "Resumo da notícia",
        source: "Fonte Parceira",
        url: "https://example.com/noticia",
        datetime: 1_755_000_000,
      },
      "finnhub",
      "PETR4"
    );

    expect(result).toMatchObject({
      source: "finnhub",
      relatedTicker: "PETR4",
      sourceName: "Fonte Parceira",
      url: "https://example.com/noticia",
      summary: "Resumo da notícia",
    });
    expect(result?.headline).toHaveLength(240);
    expect(result?.publishedAt.toISOString()).toBe("2025-08-12T12:00:00.000Z");
  });
});
