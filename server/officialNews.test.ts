import { describe, expect, it } from "vitest";
import {
  parseAgenciaBrasilFeed,
  parseOfficialAtomFeed,
  parseOfficialFeed,
} from "./officialNews";

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
      summary: "Resumo oficial.",
      sourceName: "Agência Brasil",
      category: "Mercado",
      source: "agencia-brasil",
    });
  });

  it("remove HTML codificado como entidades e usa fallback para imagem sem texto", () => {
    const result = parseAgenciaBrasilFeed(`
      <rss><channel><item>
        <title>Crédito para empresas</title>
        <description>&lt;p&gt;&lt;a href=&quot;https://agenciabrasil.ebc.com.br/&quot;&gt;&lt;img src=&quot;https://example.invalid/image.jpg&quot;&gt;&lt;/a&gt;&lt;/p&gt;</description>
        <link>https://agenciabrasil.ebc.com.br/economia/noticia/2026-08/credito</link>
        <pubDate>Mon, 24 Aug 2026 10:00:00 -0300</pubDate>
      </item></channel></rss>
    `);

    expect(result[0].summary).toBe(
      "Notícia econômica publicada pela Agência Brasil."
    );
    expect(result[0].summary).not.toMatch(/[<>]/);
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

  it("normaliza o feed Atom oficial do Banco Central", () => {
    const result = parseOfficialAtomFeed(
      `<feed><entry>
        <title type="text">Copom divulga nova decisão sobre a Selic</title>
        <updated>2026-08-24T12:19:33-03:00</updated>
        <link rel="alternate" href="https://www.bcb.gov.br/detalhenoticia/21237/noticia" />
        <content type="html">&lt;p&gt;Comunicado de política monetária.&lt;/p&gt;</content>
      </entry></feed>`,
      {
        url: "https://www.bcb.gov.br/api/feed/sitebcb/sitefeeds/noticias",
        sourceName: "Banco Central",
        source: "bcb",
        category: "Macro",
        approvedHosts: ["www.bcb.gov.br"],
        fallbackSummary: "Comunicado oficial do Banco Central.",
        maxItems: 10,
        format: "atom",
      }
    );

    expect(result[0]).toMatchObject({
      sourceName: "Banco Central",
      source: "bcb",
      category: "Macro",
      summary: "Comunicado de política monetária.",
    });
  });

  it("aceita o RSS oficial do IBGE e rejeita redirecionamento externo", () => {
    const definition = {
      url: "https://agenciadenoticias.ibge.gov.br/agencia-rss",
      sourceName: "IBGE" as const,
      source: "ibge" as const,
      category: "Macro" as const,
      approvedHosts: ["agenciadenoticias.ibge.gov.br"],
      fallbackSummary: "Divulgação estatística publicada pelo IBGE.",
      maxItems: 10,
    };
    const valid = parseOfficialFeed(
      `<rss><channel><item><title>IPCA varia em agosto</title>
       <description><![CDATA[<p>Inflação oficial do país.</p>]]></description>
       <link>https://agenciadenoticias.ibge.gov.br/agencia-sala-de-imprensa/123.html</link>
       <pubDate>Mon, 24 Aug 2026 10:00:00 -0300</pubDate></item></channel></rss>`,
      definition
    );
    expect(valid[0]).toMatchObject({ sourceName: "IBGE", category: "Macro" });

    const external = parseOfficialFeed(
      `<rss><channel><item><title>IPCA</title><description>Inflação</description>
       <link>https://example.com/ipca</link>
       <pubDate>Mon, 24 Aug 2026 10:00:00 -0300</pubDate></item></channel></rss>`,
      definition
    );
    expect(external).toEqual([]);
  });
});
