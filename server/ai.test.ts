import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

function createPublicContext() {
  return {
    user: null,
    req: {
      headers: {},
      ip: "127.0.0.1",
    } as any,
    res: {
      setHeader: () => {},
      getHeader: () => undefined,
    } as any,
  };
}

describe("Assistente de IA Educacional (CVM & Balanços)", () => {
  it("responde dúvidas sobre conceitos financeiros com aviso CVM", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.ai.chat({
      messages: [
        {
          role: "user",
          content: "Explique o que é P/L e quais suas limitações",
        },
      ],
    });

    expect(result.content).toContain("Preço sobre Lucro");
    expect(result.content).toContain("Aviso Regulatório (Resolução CVM nº 20)");
    expect(result.source).toBeDefined();
  });

  it("contextualiza ativo da B3 sem fazer recomendação de compra ou venda", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.ai.chat({
      messages: [
        {
          role: "user",
          content: "Como interpretar a dívida líquida sobre EBITDA de PETR4?",
        },
      ],
      ticker: "PETR4",
    });

    expect(result.content).toContain("Dívida Líquida sobre EBITDA");
    expect(result.content).toContain("Resolução CVM nº 20");
    expect(result.content).not.toContain("recomendo comprar");
    expect(result.content).not.toContain("recomendo vender");
  });
});
