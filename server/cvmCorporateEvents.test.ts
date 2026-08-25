import { describe, expect, it } from "vitest";
import { parseCvmCorporateEvents } from "./cvmCorporateEvents";

const header =
  "CNPJ_Companhia;Nome_Companhia;Codigo_CVM;Data_Referencia;Categoria;Tipo;Especie;Assunto;Data_Entrega;Tipo_Apresentacao;Protocolo_Entrega;Versao;Link_Download";

describe("CVM corporate events", () => {
  it("converte anúncio recente de provento com ticker inequívoco", () => {
    const csv = `${header}\n33.000.167/0001-01;PETROLEO BRASILEIRO S.A. PETROBRAS;9512;2026-08-20;Aviso aos Acionistas;Outros Avisos;;Pagamento de dividendos;2026-08-24;AP;protocolo;1;https://www.rad.cvm.gov.br/ENET/frmDownloadDocumento.aspx?id=1`;
    const items = parseCvmCorporateEvents(
      csv,
      new Date("2026-08-24T18:00:00-03:00")
    );
    expect(items[0]).toMatchObject({
      category: "Proventos",
      sourceName: "CVM — Empresas",
      source: "cvm-ipe",
      relatedTickers: ["PETR4"],
    });
  });

  it("rejeita documento antigo, domínio externo e companhia sem ticker seguro", () => {
    const rows = [
      `${header}`,
      `x;PETROBRAS;1;2025-01-01;Aviso aos Acionistas;Outros;;;2025-01-02;AP;p;1;https://www.rad.cvm.gov.br/ENET/old`,
      `x;PETROBRAS;1;2026-08-20;Aviso aos Acionistas;Outros;;Dividendos;2026-08-24;AP;p;1;https://example.com/file`,
      `x;EMPRESA SEM MAPEAMENTO;1;2026-08-20;Aviso aos Acionistas;Outros;;Dividendos;2026-08-24;AP;p;1;https://www.rad.cvm.gov.br/ENET/file`,
    ];
    expect(
      parseCvmCorporateEvents(
        rows.join("\n"),
        new Date("2026-08-24T18:00:00-03:00")
      )
    ).toEqual([]);
  });
});
