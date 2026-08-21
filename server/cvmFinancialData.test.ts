import { describe, expect, it } from "vitest";
import {
  parseCvmFinancialStatements,
  parseCvmQuarterlyHistory,
} from "./cvmFinancialData";

const balanceHeader =
  "CNPJ_CIA;DT_REFER;VERSAO;DENOM_CIA;CD_CVM;GRUPO_DFP;MOEDA;ESCALA_MOEDA;ORDEM_EXERC;DT_FIM_EXERC;CD_CONTA;DS_CONTA;VL_CONTA;ST_CONTA_FIXA";
const incomeHeader =
  "CNPJ_CIA;DT_REFER;VERSAO;DENOM_CIA;CD_CVM;GRUPO_DFP;MOEDA;ESCALA_MOEDA;ORDEM_EXERC;DT_INI_EXERC;DT_FIM_EXERC;CD_CONTA;DS_CONTA;VL_CONTA;ST_CONTA_FIXA";
const cnpj = "33.000.167/0001-01";
const balance = (statement: string, date: string, version: number, account: string, value: number, order = "ÚLTIMO") =>
  `${cnpj};${date};${version};PETROBRAS;9512;${statement};REAL;MIL;${order};${date};${account};Conta;${value};S`;
const income = (date: string, version: number, start: string, account: string, value: number, order = "ÚLTIMO") =>
  `${cnpj};${date};${version};PETROBRAS;9512;DRE;REAL;MIL;${order};${start};${date};${account};Conta;${value};S`;
const comparativeIncome = (reference: string, version: number, start: string, end: string, account: string, value: number) =>
  `${cnpj};${reference};${version};PETROBRAS;9512;DRE;REAL;MIL;PENÚLTIMO;${start};${end};${account};Conta;${value};S`;

describe("CVM financial statements", () => {
  it("selects latest version, cumulative DRE period and converts MIL to BRL", () => {
    const result = parseCvmFinancialStatements({
      ticker: "PETR4",
      cnpj,
      filing: "ITR",
      asOf: "2026-08-19T12:00:00.000Z",
      csv: {
        BPA: [balanceHeader, balance("BPA", "2026-06-30", 1, "1", 1000)].join("\n"),
        BPP: [balanceHeader, balance("BPP", "2026-06-30", 1, "2.03", 400)].join("\n"),
        DRE: [
          incomeHeader,
          income("2026-03-31", 2, "2026-01-01", "3.01", 100),
          income("2026-06-30", 1, "2026-04-01", "3.01", 70),
          income("2026-06-30", 1, "2026-04-01", "3.11", 12),
          income("2026-06-30", 1, "2026-01-01", "3.01", 170),
          income("2026-06-30", 1, "2026-01-01", "3.11", 25),
          income("2026-06-30", 1, "2025-01-01", "3.01", 150, "PENÚLTIMO"),
          income("2026-06-30", 1, "2025-01-01", "3.11", 20, "PENÚLTIMO"),
        ].join("\n"),
      },
    });
    expect(result).toMatchObject({
      filing: "ITR",
      referenceDate: "2026-06-30",
      periodStart: "2026-01-01",
      values: {
        revenue: 170_000,
        netIncome: 25_000,
        totalAssets: 1_000_000,
        equity: 400_000,
      },
      comparatives: {
        revenue: 150_000,
        netIncome: 20_000,
      },
    });
    expect(result?.quarterlyHistory).toContainEqual(
      expect.objectContaining({
        label: "2T/2026",
        revenue: 70_000,
        netIncome: 12_000,
      })
    );
  });

  it("does not infer statements for a different company", () => {
    expect(
      parseCvmFinancialStatements({
        ticker: "VALE3",
        cnpj: "00.000.000/0000-00",
        filing: "DFP",
        csv: { BPA: balanceHeader, BPP: balanceHeader, DRE: incomeHeader },
      })
    ).toBeNull();
  });

  it("uses discrete quarters, published comparatives and the latest filing version", () => {
    const csv = [
      incomeHeader,
      income("2026-06-30", 1, "2026-04-01", "3.01", 60),
      income("2026-06-30", 2, "2026-01-01", "3.01", 180),
      income("2026-06-30", 2, "2026-04-01", "3.01", 80),
      income("2026-06-30", 2, "2026-04-01", "3.11", 16),
      comparativeIncome("2026-06-30", 2, "2025-04-01", "2025-06-30", "3.01", 50),
      comparativeIncome("2026-06-30", 2, "2025-04-01", "2025-06-30", "3.11", 5),
    ].join("\n");
    expect(parseCvmQuarterlyHistory(csv, cnpj)).toEqual([
      expect.objectContaining({ label: "2T/2025", revenue: 50_000, netMargin: 10 }),
      expect.objectContaining({ label: "2T/2026", revenue: 80_000, netMargin: 20 }),
    ]);
  });
});
