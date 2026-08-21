import { describe, expect, it } from "vitest";
import { parseAgenciaBrasilFeed, parseOfficialFeed } from "./officialNews";

describe("Agência Brasil RSS", () => {
  it("normaliza metadados, remove HTML e mantém atribuição", () => {
    const result = parseAgenciaBrasilFeed(`
      <rss><channel><item>
        <title><![CDATA[Mercado &amp; economia]]></title>
        <description><![CDATA[<p>Resumo <strong>oficial</strong>.</p>]]></description>
        <link>https://agenciabrasil.ebc.com.br/economia/noticia/2026-08/exemplo</link>
        <pubDate>Wed, 19 Aug 2026 10:00:00 -0300</pubDate>
      </item></channel></rss>
    `);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      headline: "Mercado & economia",
      summary: "Resumo oficial .",
      sourceName: "Agência Brasil",
      category: "Mercado",
      source: "agencia-brasil",
    });
  });

  it("descarta links externos e itens sem data válida", () => {
    const result = parseAgenciaBrasilFeed(`
      <rss><channel><item>
        <title>Conteúdo indevido</title><description>Teste</description>
        <link>https://example.com/noticia</link><pubDate>sem data</pubDate>
      </item></channel></rss>
    `);
    expect(result).toEqual([]);
  });

  it("aceita metadados oficiais da CVM e força HTTPS nos links legados", () => {
    const result = parseOfficialFeed(
      `<rss><channel><item>
        <title><![CDATA[Ofício Circular CVM 04/26]]></title>
        <description><![CDATA[<p>Novas orientações para ofertas públicas.</p>]]></description>
        <link>http://www.cvm.gov.br/legislacao/oficio.html</link>
        <pubDate>Tue, 18 Aug 2026 12:20:54 -0300</pubDate>
      </item></channel></rss>`,
      {
        url: "https://conteudo.cvm.gov.br/feed/legislacao.xml",
        sourceName: "CVM",
        source: "cvm",
        category: "Regulação",
        approvedHosts: ["www.cvm.gov.br", "conteudo.cvm.gov.br"],
        fallbackSummary: "Atualização regulatória publicada pela CVM.",
        maxItems: 8,
      }
    );

    expect(result[0]).toMatchObject({
      sourceName: "CVM",
      category: "Regulação",
      source: "cvm",
      url: "https://www.cvm.gov.br/legislacao/oficio.html",
    });
  });
});
