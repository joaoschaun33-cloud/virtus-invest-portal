import { useMemo, useState } from "react";
import {
  Calculator,
  Layers,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Info,
  Scale,
  Gauge,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { Panel } from "@/components/apex/ApexPrimitives";
import { Slider } from "@/components/ui/slider";
import { formatPercent, formatPrice, numberValue } from "@/lib/formatters";
import {
  calculateGrahamWithMargin,
  calculateBazinWithTarget,
  calculateReverseDcf,
  calculateDupontAnalysis,
  calculateAltmanZScore,
} from "@/lib/valuation";
import { cn } from "@/lib/utils";

type AssetValuationCockpitProps = {
  ticker: string;
  price: number | null;
  peRatio: number | null;
  pbRatio: number | null;
  dividendYield: number | null;
  roe: number | null;
  netMargin: number | null;
  ebitda: number | null;
  netDebt: number | null;
  freeCashFlow?: number | null;
  statements?: {
    values: {
      revenue: number | null;
      netIncome: number | null;
      totalAssets: number | null;
      equity: number | null;
    };
  } | null;
};

export function AssetValuationCockpit({
  ticker,
  price,
  peRatio,
  pbRatio,
  dividendYield,
  roe,
  netMargin,
  ebitda,
  netDebt,
  freeCashFlow,
  statements,
}: AssetValuationCockpitProps) {
  const [activeTab, setActiveTab] = useState<"valuation" | "dupont" | "altman">(
    "valuation"
  );
  const [valuationModel, setValuationModel] = useState<
    "dcf" | "graham" | "bazin"
  >("dcf");

  // Parâmetros interativos
  const [wacc, setWacc] = useState(12.5); // %
  const [terminalGrowth, setTerminalGrowth] = useState(3.5); // %
  const [grahamMarginReq, setGrahamMarginReq] = useState(20); // %
  const [bazinTargetYield, setBazinTargetYield] = useState(6.0); // %

  const currentPrice = price && price > 0 ? price : 10.0;

  // Derivações fundamentais
  const eps =
    peRatio && peRatio > 0 && currentPrice > 0 ? currentPrice / peRatio : null;
  const bvps =
    pbRatio && pbRatio > 0 && currentPrice > 0 ? currentPrice / pbRatio : null;
  const dps =
    dividendYield && dividendYield > 0 && currentPrice > 0
      ? (currentPrice * dividendYield) / 100
      : null;

  // FCF por ação estimado (se FCF total não estiver disponível, usa proxy prudencial pelo lucro por ação)
  const fcfPerShare = useMemo(() => {
    if (freeCashFlow && freeCashFlow > 0 && eps && eps > 0) {
      return eps * 0.85; // proxy conservador
    }
    return eps && eps > 0 ? eps * 0.8 : null;
  }, [freeCashFlow, eps]);

  // 1. DCF Reverso
  const reverseDcf = useMemo(() => {
    if (!fcfPerShare || currentPrice <= 0) return null;
    return calculateReverseDcf(
      currentPrice,
      fcfPerShare,
      wacc,
      terminalGrowth,
      5
    );
  }, [currentPrice, fcfPerShare, wacc, terminalGrowth]);

  // 2. Graham com Margem
  const graham = useMemo(() => {
    if (!eps || !bvps || currentPrice <= 0) return null;
    return calculateGrahamWithMargin(bvps, eps, currentPrice, grahamMarginReq);
  }, [bvps, eps, currentPrice, grahamMarginReq]);

  // 3. Bazin com Yield
  const bazin = useMemo(() => {
    if (!dps || currentPrice <= 0) return null;
    return calculateBazinWithTarget(dps, currentPrice, bazinTargetYield);
  }, [dps, currentPrice, bazinTargetYield]);

  // 4. DuPont Analysis
  const dupont = useMemo(() => {
    if (!statements?.values) return null;
    const { revenue, netIncome, totalAssets, equity } = statements.values;
    if (!revenue || !netIncome || !totalAssets || !equity) return null;
    return calculateDupontAnalysis(revenue, netIncome, totalAssets, equity);
  }, [statements]);

  // 5. Altman Z-Score
  const altman = useMemo(() => {
    if (!statements?.values) return null;
    const { revenue, netIncome, totalAssets, equity } = statements.values;
    if (!totalAssets || !equity) return null;

    const totalLiabilities = Math.max(0.1, totalAssets - equity);
    const workingCapital = totalAssets * 0.2; // proxy padrão prudencial quando não decomposto
    const ebitVal = ebitda ?? (netIncome ? netIncome * 1.3 : totalAssets * 0.1);

    return calculateAltmanZScore(
      workingCapital,
      totalAssets,
      equity * 0.7,
      ebitVal,
      equity,
      totalLiabilities
    );
  }, [statements, ebitda]);

  return (
    <Panel className="overflow-hidden p-5 sm:p-6">
      {/* Top Header com Seletor de Módulos */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Calculator className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-bold tracking-tight sm:text-xl">
              Cockpit de Valuation & Saúde Financeira
            </h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {ticker}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Modelagem quantitativa interativa, análise DuPont e solvência corporativa.
          </p>
        </div>

        {/* Abas Superiores */}
        <div className="inline-flex rounded-xl border border-border/70 bg-card/60 p-1 backdrop-blur">
          <button
            type="button"
            onClick={() => setActiveTab("valuation")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
              activeTab === "valuation"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Valuation Dinâmico</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dupont")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
              activeTab === "dupont"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Decomposição DuPont</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("altman")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
              activeTab === "altman"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Gauge className="h-3.5 w-3.5" />
            <span>Altman Z-Score</span>
          </button>
        </div>
      </div>

      {/* Conteúdo Aba 1: Valuation Dinâmico */}
      {activeTab === "valuation" && (
        <div className="mt-5 space-y-6">
          {/* Seletor do Modelo */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                Modelo:
              </span>
              <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setValuationModel("dcf")}
                  className={cn(
                    "rounded-md px-3 py-1 font-medium transition",
                    valuationModel === "dcf"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  DCF Reverso (Crescimento Implícito)
                </button>
                <button
                  type="button"
                  onClick={() => setValuationModel("graham")}
                  className={cn(
                    "rounded-md px-3 py-1 font-medium transition",
                    valuationModel === "graham"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Fórmula de Graham
                </button>
                <button
                  type="button"
                  onClick={() => setValuationModel("bazin")}
                  className={cn(
                    "rounded-md px-3 py-1 font-medium transition",
                    valuationModel === "bazin"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Método Bazin (Preço-Teto)
                </button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Cotação de referência:{" "}
              <strong className="text-foreground">
                {formatPrice(currentPrice, "BRL")}
              </strong>
            </div>
          </div>

          {/* 1.1 DCF Reverso */}
          {valuationModel === "dcf" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  Premissas de Custo de Capital & Inflação
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Ajuste os parâmetros para simular a taxa de crescimento anual que a cotação atual exige da empresa.
                </p>

                {/* Slider WACC */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span>WACC (Taxa de Desconto)</span>
                    <span className="font-bold text-primary">
                      {wacc.toFixed(1)}% a.a.
                    </span>
                  </div>
                  <Slider
                    value={[wacc]}
                    onValueChange={([val]) => setWacc(val)}
                    min={8.0}
                    max={18.0}
                    step={0.5}
                    aria-label="WACC Taxa de Desconto"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Referência Brasil: Selic Meta + Prêmio de Risco da Ação
                  </span>
                </div>

                {/* Slider Terminal Growth */}
                <div className="space-y-2 pt-3">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span>Crescimento Perpétuo (g)</span>
                    <span className="font-bold text-foreground">
                      {terminalGrowth.toFixed(1)}% a.a.
                    </span>
                  </div>
                  <Slider
                    value={[terminalGrowth]}
                    onValueChange={([val]) => setTerminalGrowth(val)}
                    min={1.5}
                    max={5.0}
                    step={0.25}
                    aria-label="Crescimento Perpétuo g"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Alinhado à meta de inflação de longo prazo (~3,0% a 4,0%)
                  </span>
                </div>
              </div>

              {/* Resultado DCF Reverso */}
              <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-muted/20 p-5">
                {reverseDcf ? (
                  <>
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Crescimento Anual Implícito (Próximos 5 Anos)
                      </span>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span
                          className={cn(
                            "text-3xl font-bold tracking-tight sm:text-4xl",
                            reverseDcf.impliedGrowthRate > 15
                              ? "text-amber-600 dark:text-amber-400"
                              : reverseDcf.impliedGrowthRate >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          )}
                        >
                          {reverseDcf.impliedGrowthRate > 0 ? "+" : ""}
                          {reverseDcf.impliedGrowthRate.toFixed(1)}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ao ano (FCF)
                        </span>
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-foreground/90">
                        {reverseDcf.interpretation}
                      </p>
                    </div>

                    <div className="mt-5 rounded-lg border border-border/50 bg-background/50 p-3 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">
                        Diagnóstico para tomada de decisão:
                      </p>
                      <p className="mt-1">
                        Se você acredita que a empresa tem capacidade de crescer seu fluxo de caixa <strong>acima de {reverseDcf.impliedGrowthRate.toFixed(1)}% a.a.</strong>, o ativo encontra-se com margem de segurança atrativa sob suas premissas.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    Dados de fluxo de caixa ou lucro insuficientes para calibrar o DCF Reverso deste ativo.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 1.2 Graham com Margem de Segurança */}
          {valuationModel === "graham" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  Fórmula Clássica de Benjamin Graham
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Calcula o valor intrínseco baseado no Lucro por Ação (LPA) e Valor Patrimonial por Ação (VPA): <code className="rounded bg-muted px-1">V = √(22,5 × LPA × VPA)</code>.
                </p>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span>Margem de Segurança Exigida</span>
                    <span className="font-bold text-primary">
                      {grahamMarginReq}%
                    </span>
                  </div>
                  <Slider
                    value={[grahamMarginReq]}
                    onValueChange={([val]) => setGrahamMarginReq(val)}
                    min={0}
                    max={40}
                    step={5}
                    aria-label="Margem de Segurança de Graham"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Padrão institucional de Graham: 20% a 30% de desconto
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="rounded-lg bg-background/60 p-2.5">
                    <span className="text-muted-foreground">LPA Estimado:</span>
                    <p className="font-bold">
                      {eps ? formatPrice(eps, "BRL") : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-background/60 p-2.5">
                    <span className="text-muted-foreground">VPA Estimado:</span>
                    <p className="font-bold">
                      {bvps ? formatPrice(bvps, "BRL") : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Resultado Graham */}
              <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-muted/20 p-5">
                {graham ? (
                  <>
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Preço Justo de Graham
                      </span>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-3xl font-bold tracking-tight text-foreground">
                          {formatPrice(graham.fairValue, "BRL")}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            graham.currentMargin >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          )}
                        >
                          ({graham.currentMargin >= 0 ? "+" : ""}
                          {graham.currentMargin.toFixed(1)}% vs cotação)
                        </span>
                      </div>

                      <div className="mt-4 border-t border-border/50 pt-3">
                        <span className="text-xs text-muted-foreground">
                          Preço Máximo de Compra (com {graham.requiredMarginPercent}% de margem):
                        </span>
                        <p className="text-xl font-bold text-primary">
                          {formatPrice(graham.buyPriceWithMargin, "BRL")}
                        </p>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "mt-5 rounded-lg p-3 text-xs",
                        graham.isAttractive
                          ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {graham.isAttractive ? (
                        <p className="flex items-center gap-1.5 font-semibold">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          Atende ao critério de Graham com a margem exigida ({graham.requiredMarginPercent}%).
                        </p>
                      ) : (
                        <p className="flex items-center gap-1.5">
                          <Info className="h-4 w-4" />
                          A cotação atual está acima do preço de compra com margem de segurança.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    Para aplicar Graham, a empresa precisa ter LPA e VPA estritamente positivos.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 1.3 Método Décio Bazin */}
          {valuationModel === "bazin" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  Método de Décio Bazin (Preço-Teto de Dividendos)
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Determina o preço máximo a pagar para garantir o dividend yield mínimo desejado: <code className="rounded bg-muted px-1">Preço-Teto = Dividendo / Yield Alvo</code>.
                </p>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span>Dividend Yield Mínimo Alvo</span>
                    <span className="font-bold text-primary">
                      {bazinTargetYield.toFixed(1)}% a.a.
                    </span>
                  </div>
                  <Slider
                    value={[bazinTargetYield]}
                    onValueChange={([val]) => setBazinTargetYield(val)}
                    min={4.0}
                    max={10.0}
                    step={0.5}
                    aria-label="Yield Mínimo Alvo de Bazin"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Regra original de Bazin: 6,0% ao ano líquido
                  </span>
                </div>

                <div className="rounded-lg bg-background/60 p-2.5 text-xs">
                  <span className="text-muted-foreground">Dividendo por Ação (DPA):</span>
                  <p className="font-bold">
                    {dps ? formatPrice(dps, "BRL") : "—"}
                  </p>
                </div>
              </div>

              {/* Resultado Bazin */}
              <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-muted/20 p-5">
                {bazin ? (
                  <>
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Preço-Teto de Bazin (Yield {bazin.targetYieldPercent.toFixed(1)}%)
                      </span>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-3xl font-bold tracking-tight text-primary">
                          {formatPrice(bazin.ceilingPrice, "BRL")}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            bazin.margin >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          )}
                        >
                          ({bazin.margin >= 0 ? "+" : ""}
                          {bazin.margin.toFixed(1)}% de folga)
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Yield projetado no preço atual:{" "}
                        <strong className="text-foreground">
                          {bazin.currentYield.toFixed(2)}% a.a.
                        </strong>
                      </p>
                    </div>

                    <div
                      className={cn(
                        "mt-5 rounded-lg p-3 text-xs",
                        bazin.isBelowCeiling
                          ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                          : "bg-amber-500/10 text-amber-800 dark:text-amber-300"
                      )}
                    >
                      {bazin.isBelowCeiling ? (
                        <p className="flex items-center gap-1.5 font-semibold">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          Abaixo do teto: o ativo remunera acima da taxa exigida de {bazin.targetYieldPercent}%.
                        </p>
                      ) : (
                        <p className="flex items-center gap-1.5">
                          <Info className="h-4 w-4" />
                          Acima do teto: cotação atual rende menos que {bazin.targetYieldPercent}% em proventos.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    Ativo sem histórico de dividendos distribuídos no período para calcular Bazin.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conteúdo Aba 2: Decomposição DuPont */}
      {activeTab === "dupont" && (
        <div className="mt-5 space-y-6">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-5">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Estrutura de Retorno DuPont (3 Fatores)
            </h3>
            <p className="text-xs text-muted-foreground">
              Desmembra o ROE (Retorno sobre Patrimônio Líquido) para diagnosticar de onde vem a rentabilidade do acionista.
            </p>

            {dupont ? (
              <>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  {/* Fator 1: Margem Líquida */}
                  <div className="rounded-xl border border-border/50 bg-card p-4">
                    <span className="text-xs text-muted-foreground">
                      1. Eficiência Operacional
                    </span>
                    <p className="mt-1 font-semibold text-foreground">
                      Margem Líquida
                    </p>
                    <p className="mt-2 text-2xl font-bold tracking-tight text-primary">
                      {dupont.netMargin.toFixed(2)}%
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Lucro Líquido / Receita Líquida
                    </p>
                  </div>

                  {/* Fator 2: Giro do Ativo */}
                  <div className="rounded-xl border border-border/50 bg-card p-4">
                    <span className="text-xs text-muted-foreground">
                      2. Eficiência de Capital
                    </span>
                    <p className="mt-1 font-semibold text-foreground">
                      Giro do Ativo
                    </p>
                    <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                      {dupont.assetTurnover.toFixed(2)}x
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Receita Líquida / Ativo Total
                    </p>
                  </div>

                  {/* Fator 3: Alavancagem Financeira */}
                  <div className="rounded-xl border border-border/50 bg-card p-4">
                    <span className="text-xs text-muted-foreground">
                      3. Risco de Endividamento
                    </span>
                    <p className="mt-1 font-semibold text-foreground">
                      Alavancagem (Ativo/PL)
                    </p>
                    <p
                      className={cn(
                        "mt-2 text-2xl font-bold tracking-tight",
                        dupont.financialLeverage > 4.0
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-foreground"
                      )}
                    >
                      {dupont.financialLeverage.toFixed(2)}x
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Ativo Total / Patrimônio Líquido
                    </p>
                  </div>
                </div>

                {/* Síntese DuPont */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/60 p-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">
                      ROE Resultante da Decomposição:
                    </span>{" "}
                    <strong className="text-base text-foreground">
                      {dupont.calculatedRoe.toFixed(2)}%
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Principal Motor da Rentabilidade:
                    </span>{" "}
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 font-bold uppercase text-primary">
                      {dupont.primaryDriver}
                    </span>
                  </div>
                </div>

                {dupont.riskAlert && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{dupont.riskAlert}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">
                Demonstrações contábeis oficiais da CVM insuficientes para a decomposição DuPont completa.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Conteúdo Aba 3: Altman Z-Score */}
      {activeTab === "altman" && (
        <div className="mt-5 space-y-6">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  Altman Z-Score para Mercados Emergentes (EM-Score)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Métrica empírica desenvolvida pelo Prof. Edward Altman para aferir o risco de solvência corporativa.
                </p>
              </div>
              <Gauge className="h-5 w-5 text-primary" />
            </div>

            {altman ? (
              <div className="mt-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Score de Solvência Calculado:
                    </span>
                    <p className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                      {altman.score.toFixed(2)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "w-fit rounded-full px-3 py-1 text-xs font-bold uppercase",
                      altman.zone === "SAFE"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        : altman.zone === "GREY"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                    )}
                  >
                    {altman.zoneLabel}
                  </span>
                </div>

                {/* Barra Visual das 3 Zonas de Altman */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex h-3 w-full overflow-hidden rounded-full border border-border/60 bg-muted">
                    <div
                      className="bg-rose-500/70"
                      style={{ width: "25%" }}
                      title="Zona de Risco (< 1.1)"
                    />
                    <div
                      className="bg-amber-500/70"
                      style={{ width: "35%" }}
                      title="Zona de Alerta (1.1 - 2.6)"
                    />
                    <div
                      className="bg-emerald-500/70"
                      style={{ width: "40%" }}
                      title="Zona Segura (> 2.6)"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Estresse (&lt; 1,1)</span>
                    <span>Alerta (1,1 a 2,6)</span>
                    <span>Segura (&gt; 2,6)</span>
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 bg-card p-4 text-xs leading-relaxed text-foreground/90">
                  <p className="font-semibold text-foreground">
                    Diagnóstico Institucional:
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {altman.interpretation}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">
                Dados de balanço patrimonial e passivos da CVM insuficientes para o cômputo do Altman Z-Score.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Rodapé de Compliance Educacional (Resolução CVM 20/2021) */}
      <div className="mt-5 border-t border-border/50 pt-3 text-[10px] leading-4 text-muted-foreground">
        <strong>Aviso Legal & Regulatório:</strong> Os modelos de DCF Reverso, Graham, Bazin, DuPont e Altman apresentados nesta plataforma têm caráter estritamente analítico e educacional. Não constituem recomendação de investimento, relatório de análise ou oferta pública de valores mobiliários (Resolução CVM nº 20/2021). As premissas são definidas pelo próprio usuário.
      </div>
    </Panel>
  );
}
