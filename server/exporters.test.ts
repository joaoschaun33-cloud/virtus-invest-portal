import { describe, expect, it } from "vitest";
import { buildCsv, buildReportHtml } from "../client/src/lib/exporters";

describe("exportadores do Virtus", () => {
  it("gera CSV com cabeçalhos estáveis, BOM e escape de conteúdo", () => {
    const csv = buildCsv([
      { ticker: "PETR4", nome: "Petróleo, Participações", observacao: 'linha "manual"' },
      { ticker: "VALE3", nome: "Vale", observacao: "" },
    ]);

    expect(csv.startsWith("\ufeffticker,nome,observacao")).toBe(true);
    expect(csv).toContain('PETR4,"Petróleo, Participações","linha ""manual"""');
    expect(csv).toContain("VALE3,Vale,");
  });

  it("retorna vazio quando não há linhas", () => {
    expect(buildCsv([])).toBe("");
  });

  it("gera relatório HTML escapado com origem, data via subtítulo e disclaimer", () => {
    const html = buildReportHtml("Relatório <Virtus>", "Gerado em 15/08/2026 · Entrada manual", [
      { heading: "Posições", columns: ["Ativo", "Valor"], rows: [["PETR4", "R$ 1.000,00"]] },
    ]);

    expect(html).toContain("<title>Relatório &lt;Virtus&gt;</title>");
    expect(html).toContain("Gerado em 15/08/2026 · Entrada manual");
    expect(html).toContain("Relatório informativo gerado pelo Virtus");
    expect(html).toContain("Não constitui recomendação de investimento");
    expect(html).toContain("<th>Ativo</th>");
  });
});
