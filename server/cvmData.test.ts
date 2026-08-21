import { describe, expect, it } from "vitest";
import { findCvmIssuerInCsv } from "./cvmData";
import { parseDelimitedLine } from "./delimitedText";

describe("CVM company registry", () => {
  it("parses quoted delimiters without corrupting columns", () => {
    expect(parseDelimitedLine('A;"B; C";"D""E"')).toEqual(["A", "B; C", 'D"E']);
  });

  it("selects the active registration for an explicitly identified issuer", () => {
    const header =
      "CNPJ_CIA;DENOM_SOCIAL;DENOM_COMERC;SIT;CD_CVM;SETOR_ATIV;SIT_EMISSOR";
    const csv = [
      header,
      "60.872.504/0001-23;ITAÚ UNIBANCO HOLDING S.A.;ITAÚ UNIBANCO;CANCELADA;1279;Bancos;",
      "60.872.504/0001-23;ITAÚ UNIBANCO HOLDING S.A.;ITAÚ UNIBANCO;ATIVO;19348;Bancos;FASE OPERACIONAL",
    ].join("\n");
    expect(
      findCvmIssuerInCsv(
        csv,
        "ITUB4",
        "60.872.504/0001-23",
        "2026-08-19T12:00:00.000Z"
      )
    ).toMatchObject({
      ticker: "ITUB4",
      cvmCode: "19348",
      registrationStatus: "ATIVO",
      source: "cvm",
    });
  });

  it("does not guess issuers without an official identifier mapping", () => {
    expect(
      findCvmIssuerInCsv("CNPJ_CIA;SIT", "XPTO3", "00.000.000/0000-00")
    ).toBeNull();
  });
});
