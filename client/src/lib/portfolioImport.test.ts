import { describe, expect, it } from "vitest";
import { parsePortfolioFile } from "./portfolioImport";

describe("parsePortfolioFile", () => {
  it("interpreta CSV brasileiro e informa linhas inválidas", async () => {
    const file = new File(
      [
        "Ticker;Tipo;Quantidade;Preço unitário;Taxas;Data\n" +
          "PETR4;Compra;100;36,20;4,90;18/08/2026\n" +
          "VALE3;Outro;10;50;0;18/08/2026",
      ],
      "carteira.csv",
      { type: "text/csv" }
    );
    const result = await parsePortfolioFile(file);
    expect(result.rows).toEqual([
      {
        line: 2,
        ticker: "PETR4",
        transactionType: "BUY",
        quantity: 100,
        unitPrice: 36.2,
        fees: 4.9,
        transactionDate: "2026-08-18",
      },
    ]);
    expect(result.errors[0]).toMatchObject({ line: 3 });
  });
});
