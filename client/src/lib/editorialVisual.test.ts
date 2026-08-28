import { describe, expect, it } from "vitest";
import { createEditorialVisualSvg, editorialVisualFilename } from "./editorialVisual";

const input = {
  slot: "close" as const,
  title: "Fechamento do mercado <script>alert(1)</script>",
  facts: ["Ibovespa fechou em alta de 1,25%", "Dólar encerrou a R$ 5,10"],
  sources: [{ name: "B3 & fonte oficial", observedAt: "2026-08-28T20:00:00.000Z" }],
  createdAt: "2026-08-28T20:05:00.000Z",
};

describe("editorial visual", () => {
  it("gera os quatro formatos nas dimensões corretas", () => {
    expect(createEditorialVisualSvg(input, "feed")).toContain('width="1080" height="1350"');
    expect(createEditorialVisualSvg(input, "square")).toContain('width="1080" height="1080"');
    expect(createEditorialVisualSvg(input, "story")).toContain('width="1080" height="1920"');
    expect(createEditorialVisualSvg(input, "linkedin")).toContain('width="1200" height="627"');
  });

  it("escapa conteúdo editorial e preserva transparência", () => {
    const svg = createEditorialVisualSvg(input, "feed");
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).toContain("Fonte: B3 &amp; fonte oficial");
    expect(svg).toContain("Não é recomendação de investimento");
    expect(svg).toContain("#F93943");
    expect(svg).toContain("#3CF7E5");
  });

  it("cria nomes de arquivo seguros e previsíveis", () => {
    expect(editorialVisualFilename("Fechamento: ações & dólar", "feed", "png")).toBe("virtus-fechamento-acoes-dolar-feed.png");
  });
});
