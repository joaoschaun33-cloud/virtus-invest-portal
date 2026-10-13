import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM, type Message as LLMMessage } from "../_core/llm";
import { ENV } from "../_core/env";
import { logger } from "../_core/logger";
import { getAssetByTicker } from "../db";
import { getStoredCvmFinancialStatements } from "../cvmFinancialRepository";
import { deriveFinancialMetrics } from "../financialMetrics";

const CVM_REGULATORY_DISCLAIMER = `\n\n> ⚖️ **Aviso Regulatório (Resolução CVM nº 20)**: Este conteúdo possui finalidade estritamente didática e educacional sobre conceitos e demonstrações contábeis públicas. Não constitui recomendação, consultoria, research ou indicação de compra ou venda de valores mobiliários.`;

/** Knowledge base of financial concepts for guaranteed didactic fallback responses */
const FINANCIAL_KNOWLEDGE_BASE: Record<string, { title: string; explanation: string }> = {
  pl: {
    title: "Preço sobre Lucro (P/L ou P/E)",
    explanation: `O **P/L (Preço sobre Lucro)** indica quanto o mercado está disposto a pagar por cada R$ 1,00 de lucro líquido que a empresa gera.\n\n- **Fórmula:** P/L = Preço da Ação ÷ Lucro por Ação (LPA)\n- **Interpretação:** Um P/L mais baixo pode sinalizar que a ação está barata ou que o mercado projeta queda nos lucros futuros. Um P/L alto indica forte expectativa de crescimento ou lucros temporariamente deprimidos.\n- **Limitação CVM:** Empresas em prejuízo possuem P/L negativo ou indefinido, exigindo análise de outros múltiplos (como EV/EBITDA ou P/VP).`,
  },
  pvp: {
    title: "Preço sobre Valor Patrimonial (P/VP)",
    explanation: `O **P/VP** compara o valor de mercado de uma companhia com o seu patrimônio líquido contábil.\n\n- **Fórmula:** P/VP = Preço da Ação ÷ Valor Patrimonial por Ação (VPA)\n- **Interpretação:** Se P/VP < 1, a ação negocia abaixo do valor contábil dos seus ativos líquidos. Muito utilizado para bancos, seguradoras e fundos imobiliários.\n- **Atenção Didática:** Empresas de tecnologia e serviços têm muitos ativos intangíveis que não aparecem no patrimônio líquido contábil, elevando naturalmente seu P/VP.`,
  },
  roe: {
    title: "Retorno sobre o Patrimônio Líquido (ROE)",
    explanation: `O **ROE (Return on Equity)** mede a eficiência com que a diretoria da empresa gera lucro a partir dos recursos próprios aportados pelos acionistas.\n\n- **Fórmula:** ROE = (Lucro Líquido ÷ Patrimônio Líquido Médio) × 100\n- **Interpretação:** Acima de 15% ao ano na B3 costuma ser considerado um patamar competitivo saudável, indicando forte rentabilidade sobre o capital próprio.\n- **Cuidados:** Um endividamento excessivo pode inflar artificialmente o ROE, pois reduz a base de patrimônio líquido contábil. Sempre avalie o ROE junto à Dívida Líquida.`,
  },
  roic: {
    title: "Retorno sobre o Capital Investido (ROIC)",
    explanation: `O **ROIC (Return on Invested Capital)** mede a rentabilidade do capital total empregado no negócio (capital próprio + capital de terceiros oneroso).\n\n- **Fórmula:** ROIC = NOPAT (Lucro Operacional após Impostos) ÷ Capital Investido\n- **Importância:** Se o ROIC for superior ao custo médio ponderado de capital (WACC), a empresa está gerando valor econômico real aos acionistas.`,
  },
  dy: {
    title: "Dividend Yield (DY)",
    explanation: `O **Dividend Yield** expressa o percentual de proventos (dividendos e JCP) distribuídos por ação em relação à sua cotação de mercado nos últimos 12 meses.\n\n- **Fórmula:** DY = (Proventos Pagos por Ação nos últimos 12 meses ÷ Preço Atual da Ação) × 100\n- **Cuidados Didáticos:** Proventos passados não garantem proventos futuros. Vendas extraordinárias de ativos podem gerar "armadilhas de dividendos" (dividend traps) com yields inflados temporariamente.`,
  },
  graham: {
    title: "Preço Justo de Benjamin Graham",
    explanation: `O método de **Benjamin Graham** estabelece um preço teto de segurança baseado na premissa de que uma empresa de valor não deveria negociar simultaneamente acima de 15 vezes seus lucros e 1,5 vezes seu valor patrimonial (15 × 1,5 = 22,5).\n\n- **Fórmula Clássica:** Preço Justo = √(22,5 × LPA × VPA)\n- **Premissas e Limitações:** Foi concebido na década de 1930 para companhias industriais tangíveis com lucros estáveis e previsíveis. Não se aplica bem a empresas de hipercrescimento, tecnologia ou companhias cíclicas em fundo de poço.`,
  },
  bazin: {
    title: "Método de Décio Bazin",
    explanation: `O modelo de **Décio Bazin** (autor de *Faça Fortuna com Ações*) busca ações pagadoras de dividendos com margem de segurança de proventos e endividamento sob controle.\n\n- **Preço Teto de Bazin:** Dividendo Médio Anual por Ação ÷ 0,06 (pressupõe retorno mínimo em dividendos de 6% a.a.)\n- **Filtros de Segurança de Bazin:** Recomenda evitar empresas com endividamento excessivo (Dívida Líquida/EBITDA elevado) ou histórico irregular de distribuição de resultados.`,
  },
  divida: {
    title: "Dívida Líquida sobre EBITDA",
    explanation: `A relação **Dívida Líquida / EBITDA** estima em quantos anos a empresa quitaria toda sua dívida líquida caso mantivesse sua geração de caixa operacional constante.\n\n- **Fórmula:** (Dívida Bruta - Caixa e Equivalentes) ÷ EBITDA dos últimos 12 meses\n- **Parâmetros Típicos:** Valores abaixo de 2,5x a 3,0x geralmente indicam alavancagem financeira saudável. Acima de 3,5x merecem cautela redobrada em períodos de taxa Selic alta.`,
  },
  cvm: {
    title: "Demonstrações Contábeis Públicas na CVM (ITR e DFP)",
    explanation: `A Comissão de Valores Mobiliários (CVM) exige que companhias abertas na B3 publiquem trimestralmente as **ITR** (Informações Trimestrais) e anualmente as **DFP** (Demonstrações Financeiras Padronizadas).\n\nAs três demonstrações fundamentais são:\n1. **Balanço Patrimonial (BP):** Foto dos Ativos (bens e direitos), Passivos (obrigações) e Patrimônio Líquido na data-base.\n2. **Demonstração do Resultado do Exercício (DRE):** Filme do período, detalhando Receita Bruta, Deduções, Custos, Despesas Operacionais, EBITDA e Lucro Líquido.\n3. **Demonstração do Fluxo de Caixa (DFC):** Movimentação real do caixa dividida em Operacional (FCO), Investimento (FCI) e Financiamento (FCF).`,
  },
};

function generateEducationalFallback(userPrompt: string, tickerContext?: string | null): string {
  const normalized = userPrompt.toLowerCase();

  let matchedConcept: { title: string; explanation: string } | null = null;
  if (normalized.includes("p/l") || normalized.includes("pl ") || normalized.includes("lucro por ação") || normalized.includes("lpa")) {
    matchedConcept = FINANCIAL_KNOWLEDGE_BASE.pl;
  } else if (normalized.includes("p/vp") || normalized.includes("pvp") || normalized.includes("patrimonial")) {
    matchedConcept = FINANCIAL_KNOWLEDGE_BASE.pvp;
  } else if (normalized.includes("roic")) {
    matchedConcept = FINANCIAL_KNOWLEDGE_BASE.roic;
  } else if (normalized.includes("roe")) {
    matchedConcept = FINANCIAL_KNOWLEDGE_BASE.roe;
  } else if (normalized.includes("dividend") || normalized.includes("dy") || normalized.includes("provento") || normalized.includes("jcp")) {
    matchedConcept = FINANCIAL_KNOWLEDGE_BASE.dy;
  } else if (normalized.includes("graham") || normalized.includes("preço justo")) {
    matchedConcept = FINANCIAL_KNOWLEDGE_BASE.graham;
  } else if (normalized.includes("bazin") || normalized.includes("preço teto")) {
    matchedConcept = FINANCIAL_KNOWLEDGE_BASE.bazin;
  } else if (normalized.includes("dívida") || normalized.includes("divida") || normalized.includes("ebitda") || normalized.includes("alavancagem")) {
    matchedConcept = FINANCIAL_KNOWLEDGE_BASE.divida;
  } else if (normalized.includes("cvm") || normalized.includes("balanço") || normalized.includes("balanco") || normalized.includes("dre") || normalized.includes("itr") || normalized.includes("dfp")) {
    matchedConcept = FINANCIAL_KNOWLEDGE_BASE.cvm;
  }

  let text = "";
  if (matchedConcept) {
    text = `### 📚 ${matchedConcept.title}\n\n${matchedConcept.explanation}`;
  } else {
    text = `### 🎓 Análise Didática de Fundamentos\n\nNo mercado de capitais brasileiro, a análise fundamentalista consiste em entender a capacidade de uma companhia gerar valor sustentável no longo prazo através de seus relatórios contábeis oficiais (CVM/B3).\n\nOs quatro pilares didáticos principais são:\n1. **Rentabilidade Operacional:** Avaliada por Margem Líquida, ROE e ROIC.\n2. **Alavancagem e Solvência:** Mensurada por Dívida Líquida / EBITDA e Liquidez Corrente.\n3. **Geração de Caixa Real:** Verificada no Fluxo de Caixa Operacional (FCO) vs Lucro Contábil.\n4. **Preço vs Valor:** Múltiplos como P/L, P/VP e Dividend Yield contextualizados ao setor e à taxa básica de juros (Selic).`;
  }

  if (tickerContext) {
    text += `\n\n---\n**💡 Contexto do Ativo em Estudo (${tickerContext})**:\nPara este ativo, recomenda-se cruzar as métricas com pares diretos do mesmo setor na B3. Fatores regulatórios, benefícios fiscais e ciclos macroeconômicos afetam a previsibilidade dos resultados.`;
  }

  return text + CVM_REGULATORY_DISCLAIMER;
}

export const aiRouter = router({
  chat: publicProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(["system", "user", "assistant"]),
            content: z.string(),
          })
        ),
        ticker: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { messages, ticker } = input;
      const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
      const userText = lastUserMessage?.content ?? "";

      // Optional real ticker context from database
      let assetContextStr = "";
      if (ticker) {
        try {
          const asset = await getAssetByTicker(ticker.toUpperCase());
          if (asset) {
            const statement = await getStoredCvmFinancialStatements(asset.id, asset.ticker);
            const derived = statement ? deriveFinancialMetrics(statement) : [];
            const metricsSummary = derived
              .map(m => `${m.label}: ${m.value.toFixed(2)}${m.unit}`)
              .join(", ");

            assetContextStr = `Ativo: ${asset.ticker} (${asset.name}). Preço: R$ ${asset.lastPrice ?? "N/D"}. P/L: ${asset.peRatio ?? "N/D"}, P/VP: ${asset.pbRatio ?? "N/D"}, DY: ${asset.dividendYield ?? "N/D"}%. Métricas CVM recentes: ${metricsSummary || "Sem demonstração trimestral recente arquivada"}.`;
          }
        } catch (err) {
          logger.warn("ai.asset_context_fetch_error", {
            ticker,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // If an LLM API key is present in environment, call invokeLLM
      const hasApiKey = Boolean(
        ENV.forgeApiKey ||
          process.env.BUILT_IN_FORGE_API_KEY ||
          process.env.GEMINI_API_KEY ||
          process.env.OPENAI_API_KEY
      );

      if (hasApiKey) {
        try {
          const systemPrompt = `Você é o Assistente Educacional Virtus, especialista em mercado de capitais brasileiro (B3), contabilidade societária e normas da CVM.
Seu objetivo é EXCLUSIVAMENTE DIDÁTICO e EDUCACIONAL:
1. Explique indicadores fundamentalistas, balanços patrimoniais, DRE e fluxo de caixa de forma clara, técnica e acessível.
2. NUNCA faça recomendações de compra, venda ou alocação de ativos (cumprimento estrito da Resolução CVM nº 20).
3. Ressalte que modelos históricos (Graham, Bazin, DCF) são aproximações matemáticas com limitações.
4. Ao final de cada resposta, inclua um parágrafo amigável incentivando o estudo crítico.
${assetContextStr ? `Dados do ativo em tela: ${assetContextStr}` : ""}`;

          const llmMessages: LLMMessage[] = [
            { role: "system", content: systemPrompt },
            ...messages.map(m => ({
              role: m.role as "user" | "assistant" | "system",
              content: m.content,
            })),
          ];

          const response = await invokeLLM({
            messages: llmMessages,
            max_tokens: 1024,
          });

          const choice = response.choices?.[0];
          const rawContent = choice?.message?.content;
          const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent ?? "");

          if (content && content.trim().length > 0) {
            return {
              content: `${content.trim()}${CVM_REGULATORY_DISCLAIMER}`,
              source: "llm",
            };
          }
        } catch (error) {
          logger.warn("ai.llm_call_fallback_triggered", {
            error: error instanceof Error ? error.message : error,
          });
        }
      }

      // Fallback engine: deterministic educational engine with CVM adherence
      const fallbackResponse = generateEducationalFallback(userText, ticker);
      return {
        content: fallbackResponse,
        source: "educational-engine",
      };
    }),
});
