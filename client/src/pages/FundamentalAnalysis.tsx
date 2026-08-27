import DashboardLayout from "@/components/DashboardLayout";
import { DataProvenance } from "@/components/DataProvenance";
import { Panel } from "@/components/apex/ApexPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculateValuation, signalForMargin, signalForPeg, type Signal } from "@/lib/valuation";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Check, CircleHelp, Minus, Search, ShieldCheck, TrendingUp, WalletCards, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import type { MarketDataSource } from "../../../shared/marketData";
import { trackProductEvent } from "@/lib/analytics";
import { optionalNumberValue } from "@/lib/formatters";

const fieldLabels = {
  price: "Preço atual (R$)", eps: "LPA (R$)", pe: "P/L", bvps: "VPA (R$)",
  dividend: "Dividendos por ação (R$)", growth: "Crescimento (% a.a.)", roe: "ROE (%)",
  margin: "Margem líquida (%)", debtEbitda: "Dívida líquida / EBITDA",
};
type Field = keyof typeof fieldLabels;
type Fields = Record<Field, string>;
const emptyFields: Fields = { price: "", eps: "", pe: "", bvps: "", dividend: "", growth: "", roe: "", margin: "", debtEbitda: "" };
const number = (value: unknown) => optionalNumberValue(value);
const fieldNumber = (value: string) => { const parsed = Number(value.replace(",", ".")); return Number.isFinite(parsed) && value.trim() ? parsed : null; };
const display = (value: number | null | undefined, digits = 2) => value === null || value === undefined ? "—" : value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const money = (value: number | null) => value === null ? "Indefinido" : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function FundamentalAnalysis() {
  const [ticker, setTicker] = useState(() => localStorage.getItem("virtus-analysis-ticker") ?? "");
  const [submitted, setSubmitted] = useState("");
  const [fields, setFields] = useState<Fields>(emptyFields);
  const [profitTrend, setProfitTrend] = useState<"yes" | "no" | "unknown">("unknown");
  const query = trpc.market.asset.useQuery({ ticker: submitted, interval: "1D" }, { enabled: Boolean(submitted), staleTime: 60_000, retry: 1 });
  const snapshot = query.data;
  const advancedAsset = (snapshot?.asset ?? {}) as Record<string, unknown>;

  useEffect(() => {
    if (!snapshot?.asset) return;
    trackProductEvent("analysis_loaded", { ticker: snapshot.asset.ticker, source: snapshot.fundamentalsMeta.source });
    const price = number(snapshot.quote.price);
    const pe = number(snapshot.asset.peRatio);
    const pb = number(snapshot.asset.pbRatio);
    const dy = number(snapshot.asset.dividendYield);
    const ebitda = number(advancedAsset.ebitda); const netDebt = number(advancedAsset.netDebt);
    const normalizedPercent = (value: number | null) => value === null ? null : Math.abs(value) <= 1 ? value * 100 : value;
    const next: Fields = {
      price: price === null ? "" : String(price), pe: pe === null ? "" : String(pe),
      eps: price && pe && pe > 0 ? String(price / pe) : "",
      bvps: price && pb && pb > 0 ? String(price / pb) : "",
      dividend: price && dy ? String(price * normalizedPercent(dy)! / 100) : "",
      growth: String(normalizedPercent(number(advancedAsset.earningsGrowth)) ?? normalizedPercent(number(advancedAsset.revenueGrowth)) ?? ""),
      roe: String(normalizedPercent(number(snapshot.asset.roe)) ?? ""),
      margin: String(normalizedPercent(number(snapshot.asset.netMargin)) ?? ""),
      debtEbitda: ebitda && netDebt !== null ? String(netDebt / ebitda) : "",
    };
    setFields(next);
  }, [advancedAsset, snapshot]);

  useEffect(() => {
    if (query.isError && submitted)
      trackProductEvent("analysis_failed", { ticker: submitted });
  }, [query.isError, submitted]);

  function search(event: FormEvent) {
    event.preventDefault(); const normalized = ticker.trim().toUpperCase(); if (!normalized) return;
    localStorage.setItem("virtus-analysis-ticker", normalized); trackProductEvent("analysis_search", { ticker: normalized }); setTicker(normalized); setFields(emptyFields); setProfitTrend("unknown"); setSubmitted(normalized);
  }
  const values = useMemo(() => Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fieldNumber(value)])) as Record<Field, number | null>, [fields]);
  const analysis = values.price && values.price > 0 ? calculateValuation({
    price: values.price, bookValuePerShare: values.bvps ?? 0, earningsPerShare: values.eps ?? 0,
    pe: values.pe, dividendPerShare: values.dividend ?? 0, earningsGrowth: values.growth ?? 0,
    roe: values.roe, netMargin: values.margin, netDebtEbitda: values.debtEbitda,
    growingProfitFiveYears: profitTrend === "unknown" ? null : profitTrend === "yes",
  }) : null;

  return <DashboardLayout allowAnonymous><div className="mx-auto max-w-6xl px-2 py-6 sm:px-5 sm:py-9">
    <header className="max-w-3xl"><span className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Ferramenta educacional</span><h1 className="mt-2 text-3xl font-semibold tracking-[-.045em] sm:text-4xl">Análise fundamentalista</h1><p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Aplique quatro métodos clássicos a dados públicos do ativo. Confira e edite cada entrada antes de interpretar os resultados.</p></header>
    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[.07] p-4 text-sm leading-6 text-amber-900 dark:text-amber-200"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><p><strong>Não é recomendação.</strong> Fórmulas históricas simplificam a realidade, não estimam o futuro e não substituem uma análise completa da empresa, do setor e dos riscos.</p></div>
    <form onSubmit={search} className="mt-6 flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="Digite um ticker, por exemplo: PETR4" className="h-12 pl-10 uppercase" aria-label="Ticker do ativo" /></div><Button type="submit" className="h-12 px-5" disabled={!ticker.trim() || query.isFetching}>{query.isFetching ? "Buscando…" : "Buscar dados"}</Button></form>
    {query.isError && <p role="alert" className="mt-3 rounded-xl border border-rose-500/25 bg-rose-500/[.06] p-3 text-sm text-rose-700 dark:text-rose-300">Não foi possível consultar o ativo. Confira o ticker ou tente novamente.</p>}
    {snapshot?.asset && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/25 p-4"><div><p className="font-semibold">{snapshot.asset.ticker} · {snapshot.asset.name}</p><p className="mt-1 text-xs text-muted-foreground">Campos derivados de P/L, P/VP e DY são aproximações e permanecem editáveis.</p></div><DataProvenance source={snapshot.fundamentalsMeta.source as MarketDataSource} asOf={snapshot.fundamentalsMeta.asOf} freshness={snapshot.fundamentalsMeta.freshness} compact /></div>}

    <Panel className="mt-6 p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Dados utilizados nos cálculos</h2><p className="mt-1 text-xs text-muted-foreground">Automático quando disponível · sempre editável</p></div><CircleHelp className="h-5 w-5 text-muted-foreground" /></div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(Object.keys(fieldLabels) as Field[]).map(key => <label key={key}><span className="mb-1.5 block text-xs font-medium">{fieldLabels[key]}</span><Input inputMode="decimal" value={fields[key]} onChange={e => setFields(current => ({ ...current, [key]: e.target.value }))} placeholder="Sem dado" /></label>)}</div><div className="mt-5"><p className="text-xs font-medium">Lucro crescente nos últimos cinco anos?</p><div className="mt-2 flex gap-2">{([['yes','Sim'],['no','Não'],['unknown','Sem dado']] as const).map(([value,label]) => <Button key={value} type="button" size="sm" variant={profitTrend === value ? "default" : "outline"} onClick={() => setProfitTrend(value)}>{label}</Button>)}</div></div></Panel>

    {analysis ? <div className="mt-6 grid gap-4 md:grid-cols-2"><MethodCard title="Benjamin Graham" subtitle="Preço teórico por lucro e patrimônio" signal={signalForMargin(analysis.grahamMargin)} value={money(analysis.grahamPrice)} detail={analysis.grahamMargin === null ? "Preencha VPA e LPA positivos." : `Diferença para o preço atual: ${display(analysis.grahamMargin, 1)}%`} /><MethodCard title="Décio Bazin" subtitle="Preço teto com referência de yield de 6%" signal={analysis.bazinPrice === null ? "neutral" : values.price! <= analysis.bazinPrice ? "positive" : "attention"} value={money(analysis.bazinPrice)} detail={analysis.dividendYield === null ? "Preencha dividendos por ação." : `Yield implícito informado: ${display(analysis.dividendYield)}%`} /><BuffettCard criteria={analysis.criteria} score={analysis.score} total={analysis.evaluated} /><MethodCard title="Peter Lynch" subtitle="PEG: P/L dividido pelo crescimento informado" signal={signalForPeg(analysis.peg)} value={analysis.peg === null ? "Indefinido" : display(analysis.peg)} detail={analysis.peg === null ? "Preencha P/L e crescimento positivos." : analysis.peg < 1 ? "Abaixo de 1 no modelo; investigue a sustentabilidade do crescimento." : analysis.peg <= 1.5 ? "Entre 1 e 1,5 no modelo." : "Acima de 1,5 no modelo; crescimento e preço exigem contexto."} /></div> : <div className="mt-6 rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Busque um ticker ou informe um preço atual para começar.</div>}
    <div className="mt-6 flex flex-wrap gap-3"><Link href={submitted ? `/asset/${submitted}` : "/markets"}><Button variant="outline">Ver página completa do ativo</Button></Link><Link href="/guia"><Button variant="ghost">Revisar conceitos no guia</Button></Link></div>
  </div></DashboardLayout>;
}

const signalStyle: Record<Signal, string> = { positive: "text-emerald-700 dark:text-emerald-300", attention: "text-amber-700 dark:text-amber-300", negative: "text-rose-700 dark:text-rose-300", neutral: "text-muted-foreground" };
function MethodCard({ title, subtitle, signal, value, detail }: { title: string; subtitle: string; signal: Signal; value: string; detail: string }) { return <Panel className="p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{subtitle}</p></div><WalletCards className="h-5 w-5 text-primary" /></div><p className={`mt-6 text-3xl font-semibold tracking-tight ${signalStyle[signal]}`}>{value}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p></Panel>; }
function BuffettCard({ criteria, score, total }: { criteria: ReturnType<typeof calculateValuation>["criteria"]; score: number; total: number }) { return <Panel className="p-5"><div className="flex items-start justify-between"><div><h2 className="font-semibold">Checklist de qualidade</h2><p className="mt-1 text-xs text-muted-foreground">Critérios inspirados em princípios associados a Buffett</p></div><ShieldCheck className="h-5 w-5 text-primary" /></div><p className="mt-5 text-2xl font-semibold">{score} de {total || 0} <span className="text-sm font-normal text-muted-foreground">avaliáveis</span></p><ul className="mt-4 space-y-2">{criteria.map(item => <li key={item.label} className="flex items-center gap-2 text-xs"><span className={`flex h-5 w-5 items-center justify-center rounded-full ${item.value === null ? "bg-muted" : item.passes ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-700"}`}>{item.value === null ? <Minus className="h-3 w-3" /> : item.passes ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}</span><span className="flex-1">{item.label}</span><strong>{item.display}</strong></li>)}</ul></Panel>; }
