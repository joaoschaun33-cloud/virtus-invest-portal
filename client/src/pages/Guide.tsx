import DashboardLayout from "@/components/DashboardLayout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ArrowRight, BookOpen, Check, CheckCircle2, GraduationCap, Info, PieChart, ShieldCheck, Target, Triangle, WalletCards, X, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { trackProductEvent } from "@/lib/analytics";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const STORAGE_KEY = "virtus-guide-progress-v1";
const GOAL_KEY = "virtus-guide-goal-v1";
const QUIZ_KEY = "virtus-guide-quizzes-v1";
const blockIds = ["reserva", "triangulo", "ativos", "carteira", "dicionario"];
type Goal = "reserva" | "planejar" | "investir";
const goals: Record<Goal, { title: string; description: string; path: string[] }> = {
  reserva: { title: "Criar minha reserva", description: "Organizar proteção para imprevistos.", path: ["reserva", "triangulo", "dicionario"] },
  planejar: { title: "Planejar um objetivo", description: "Entender prazo, risco e possíveis composições.", path: ["reserva", "triangulo", "ativos", "carteira"] },
  investir: { title: "Começar a analisar", description: "Conhecer ativos e praticar uma leitura fundamentalista.", path: ["triangulo", "ativos", "carteira", "dicionario"] },
};
const blockLabels: Record<string, string> = { reserva: "Reserva", triangulo: "Risco e liquidez", ativos: "Tipos de ativos", carteira: "Composição", dicionario: "Dicionário" };

const assets = {
  "Renda fixa": [
    { name: "Tesouro Selic", text: "Título público cuja rentabilidade acompanha a Selic. Tem baixa volatilidade e costuma ser usado para objetivos de curto prazo.", pros: ["Garantia do Tesouro Nacional", "Liquidez diária em condições normais"], cons: ["Resgate antecipado ocorre a preço de mercado", "Há tributação e custos conforme as regras vigentes"] },
    { name: "Tesouro IPCA+", text: "Combina a variação do IPCA com uma taxa contratada e é voltado a objetivos de prazo mais longo.", pros: ["Proteção do poder de compra se levado ao vencimento", "Útil para objetivos com data definida"], cons: ["Pode oscilar bastante antes do vencimento", "Não é apropriado para reserva de emergência"] },
    { name: "Tesouro Prefixado", text: "Define uma taxa na compra. O retorno contratado é obtido quando o título é mantido até o vencimento.", pros: ["Previsibilidade no vencimento", "Pode se beneficiar de uma queda futura dos juros"], cons: ["Pode perder para a inflação", "O preço oscila no resgate antecipado"] },
    { name: "CDB", text: "Título emitido por banco, frequentemente remunerado como percentual do CDI.", pros: ["Pode oferecer liquidez diária", "Produtos elegíveis contam com cobertura do FGC"], cons: ["Risco depende da instituição emissora", "Há IR regressivo"] },
    { name: "LCI / LCA", text: "Títulos bancários ligados aos setores imobiliário e do agronegócio.", pros: ["Isenção de IR para pessoa física nas regras atuais", "Produtos elegíveis contam com FGC"], cons: ["Podem ter carência", "Compare sempre a rentabilidade líquida"] },
  ],
  "Renda variável": [
    { name: "Ações", text: "Representam uma participação em uma empresa e os preços podem variar bastante.", pros: ["Participação no crescimento da empresa", "Possibilidade de receber proventos"], cons: ["Pode haver perda de capital", "Exige análise e horizonte adequado"] },
    { name: "FIIs", text: "Fundos negociados em bolsa que investem em imóveis ou títulos do setor imobiliário.", pros: ["Acesso diversificado ao setor", "Distribuições periódicas podem ocorrer"], cons: ["Cotas e rendimentos oscilam", "Há riscos de vacância, crédito e gestão"] },
    { name: "ETFs", text: "Fundos que procuram acompanhar um índice ou estratégia definida.", pros: ["Diversificação em uma única cota", "Regras de composição conhecidas"], cons: ["Acompanha também as quedas do índice", "Custos e tributação variam"] },
    { name: "BDRs", text: "Recibos negociados no Brasil que representam ativos emitidos no exterior.", pros: ["Exposição internacional pela B3", "Diversificação geográfica"], cons: ["Exposição ao câmbio", "Liquidez varia entre recibos"] },
  ],
};

const allocations = {
  Conservador: { description: "Prioriza estabilidade e liquidez, aceitando menor potencial de retorno.", slices: [["Renda fixa", 85], ["FIIs", 10], ["Ações / ETFs", 5]] },
  Moderado: { description: "Aceita alguma oscilação para buscar crescimento no médio e longo prazo.", slices: [["Renda fixa", 60], ["FIIs", 15], ["Ações / ETFs", 20], ["Exterior", 5]] },
  Arrojado: { description: "Tolera oscilações relevantes e perdas temporárias em busca de crescimento no longo prazo.", slices: [["Renda fixa", 30], ["FIIs", 15], ["Ações / ETFs", 40], ["Exterior", 15]] },
} as const;

const glossary = [
  ["CDI", "Taxa de referência das operações entre bancos, muito usada como régua para investimentos de renda fixa.", "Um CDB de 100% do CDI acompanha essa referência antes de impostos."],
  ["Diversificação", "Distribuição dos recursos entre ativos e riscos diferentes para reduzir a dependência de uma única posição."],
  ["Dividend Yield", "Relação entre os proventos distribuídos e o preço do ativo em determinado período.", "R$ 1,40 distribuído para uma ação de R$ 20 corresponde a 7% nesse cálculo."],
  ["FGC", "Fundo Garantidor de Créditos. Produtos elegíveis têm cobertura de até R$ 250 mil por CPF ou CNPJ e conglomerado, respeitado o teto de R$ 1 milhão em quatro anos."],
  ["IPCA", "Índice oficial usado como referência para medir a inflação ao consumidor no Brasil."],
  ["Liquidez", "Facilidade e prazo para transformar um investimento em dinheiro, considerando as condições de resgate.", "Um ativo negociado diariamente tende a ter mais liquidez que um imóvel."],
  ["Marcação a mercado", "Atualização do preço de um ativo conforme as condições atuais do mercado.", "Um título pode aparecer abaixo do preço de compra antes do vencimento."],
  ["P/L", "Preço da ação dividido pelo lucro por ação. É uma relação histórica, não uma previsão de retorno.", "P/L 10 significa preço equivalente a dez vezes o lucro anual atual por ação."],
  ["Renda fixa", "Investimentos cujas regras de remuneração são definidas na contratação, embora preço e retorno possam variar em algumas situações."],
  ["Renda variável", "Ativos cujo preço e retorno não são conhecidos antecipadamente e podem gerar perdas."],
  ["ROE", "Indicador que relaciona o lucro de uma empresa ao seu patrimônio líquido."],
  ["Selic", "Taxa básica de juros da economia brasileira, definida pelo Copom."],
  ["Volatilidade", "Medida da intensidade das oscilações de preço de um ativo.", "Quanto maiores e mais frequentes as variações, maior a volatilidade observada."],
  ["Yield", "Rendimento de um ativo em relação ao seu preço, calculado segundo um período e uma metodologia.", "R$ 8 anuais sobre um preço de R$ 100 representam yield de 8%."],
] as const;

function money(value: number) { return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }); }

export default function Guide() {
  const { user } = useAuth();
  const preferences = trpc.portfolio.preferences.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const savePreferences = trpc.portfolio.savePreferences.useMutation();
  const [seen, setSeen] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[\"reserva\"]")); } catch { return new Set(["reserva"]); }
  });
  const [open, setOpen] = useState<string[]>(["reserva"]);
  const [goal, setGoal] = useState<Goal | null>(() => (localStorage.getItem(GOAL_KEY) as Goal | null));
  const [quizzes, setQuizzes] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(QUIZ_KEY) ?? "[]")); } catch { return new Set(); }
  });
  const [celebrate, setCelebrate] = useState(false);
  const celebrated = useRef(seen.size === blockIds.length);
  const serverProgressApplied = useRef(false);

  useEffect(() => {
    if (!user || !preferences.isFetched || serverProgressApplied.current) return;
    serverProgressApplied.current = true;
    const stored = preferences.data?.guideProgress;
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as {
        goal?: Goal | null;
        seen?: string[];
        quizzes?: string[];
      };
      const validSeen = (parsed.seen ?? []).filter(id => blockIds.includes(id));
      const validQuizzes = (parsed.quizzes ?? []).filter(id => blockIds.includes(id));
      const validGoal = parsed.goal && parsed.goal in goals ? parsed.goal : null;
      setSeen(new Set(validSeen.length ? validSeen : ["reserva"]));
      setQuizzes(new Set(validQuizzes));
      setGoal(validGoal);
      if (validGoal) setOpen([goals[validGoal].path[0]]);
    } catch {
      // A cópia local continua disponível se um registro antigo for inválido.
    }
  }, [preferences.data?.guideProgress, preferences.isFetched, user]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(seen))); }, [seen]);
  useEffect(() => { localStorage.setItem(QUIZ_KEY, JSON.stringify(Array.from(quizzes))); }, [quizzes]);
  useEffect(() => {
    if (!user || !preferences.isFetched || !serverProgressApplied.current) return;
    const timer = window.setTimeout(() => {
      savePreferences.mutate({
        guideProgress: JSON.stringify({
          version: 1,
          goal,
          seen: Array.from(seen),
          quizzes: Array.from(quizzes),
          savedAt: new Date().toISOString(),
        }),
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [goal, preferences.isFetched, quizzes, seen, user]);
  function chooseGoal(value: Goal) { setGoal(value); localStorage.setItem(GOAL_KEY, value); setOpen([goals[value].path[0]]); trackProductEvent("guide_goal_selected", { goal: value }); }
  function completeQuiz(id: string) { setQuizzes(previous => { const next = new Set(previous).add(id); trackProductEvent("guide_quiz_completed", { module: id, completed: next.size }); if (next.size === blockIds.length) trackProductEvent("guide_completed", { modules: next.size }); return next; }); }
  function changeOpen(values: string[]) {
    setOpen(values);
    setSeen(previous => {
      const next = new Set(previous); values.forEach(value => { if (!next.has(value)) trackProductEvent("guide_module_opened", { module: value }); next.add(value); });
      if (next.size === blockIds.length && !celebrated.current) { celebrated.current = true; setCelebrate(true); }
      return next;
    });
  }

  return <DashboardLayout allowAnonymous>
    <div className="mx-auto w-full max-w-5xl px-2 py-5 sm:px-5 sm:py-8">
      <header className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/[0.05] p-6 sm:p-9">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"><GraduationCap className="h-4 w-4" /> Comece aqui</span>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-.045em] sm:text-4xl">Guia do iniciante</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Os conceitos essenciais, na ordem certa. Aprenda no seu ritmo e use as ferramentas do Virtus para praticar.</p>
        </div>
      </header>

      <GoalChooser value={goal} onChange={chooseGoal} />
      {goal && <LearningPath goal={goal} seen={seen} />}

      <div className="mt-6 flex items-center gap-3" aria-label={`${seen.size} de 5 blocos visitados`}>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${seen.size * 20}%` }} /></div>
        <span className="text-xs font-medium text-muted-foreground">{seen.size} de 5 blocos</span>
      </div>

      <Accordion type="multiple" value={open} onValueChange={changeOpen} className="mt-5 space-y-4">
        <GuideBlock value="reserva" icon={<ShieldCheck />} title="Reserva de emergência" subtitle="Estime sua proteção e entenda os critérios para guardar esse dinheiro."><EmergencyFund /><LearningCheck id="reserva" completed={quizzes.has("reserva")} question="Qual critério deve ter prioridade numa reserva de emergência?" options={["Maior retorno possível", "Facilidade de resgate e baixo risco", "Oscilação elevada"]} correct={1} onComplete={completeQuiz} /></GuideBlock>
        <GuideBlock value="triangulo" icon={<Triangle />} title="Risco, retorno e liquidez" subtitle="Entenda os três critérios que se combinam em todo investimento."><InvestmentTriangle /><LearningCheck id="triangulo" completed={quizzes.has("triangulo")} question="O que normalmente acontece ao buscar maior retorno?" options={["Todo risco desaparece", "A liquidez sempre aumenta", "Algum risco adicional costuma ser assumido"]} correct={2} onComplete={completeQuiz} /></GuideBlock>
        <GuideBlock value="ativos" icon={<WalletCards />} title="Tipos de ativos" subtitle="Conheça renda fixa e renda variável, com vantagens e riscos."><AssetExplorer /><LearningCheck id="ativos" completed={quizzes.has("ativos")} question="Qual afirmação é correta?" options={["Renda fixa nunca oscila", "Renda variável pode gerar perdas", "Todo CDB possui liquidez diária"]} correct={1} onComplete={completeQuiz} /></GuideBlock>
        <GuideBlock value="carteira" icon={<PieChart />} title="Exemplos de composição" subtitle="Visualizações educacionais para diferentes tolerâncias a oscilações."><Allocation /><LearningCheck id="carteira" completed={quizzes.has("carteira")} question="As composições apresentadas no guia são:" options={["Recomendações personalizadas", "Garantias de rentabilidade", "Exemplos educacionais"]} correct={2} onComplete={completeQuiz} /></GuideBlock>
        <GuideBlock value="dicionario" icon={<BookOpen />} title="Dicionário do investidor" subtitle="Consulte rapidamente os termos encontrados no portal."><Dictionary /><LearningCheck id="dicionario" completed={quizzes.has("dicionario")} question="Liquidez descreve principalmente:" options={["O prazo e a facilidade de converter um ativo em dinheiro", "O lucro futuro garantido", "A ausência de impostos"]} correct={0} onComplete={completeQuiz} /></GuideBlock>
      </Accordion>

      <NextStep goal={goal} seen={seen} quizzes={quizzes} onOpen={id => setOpen(current => current.includes(id) ? current : [...current, id])} />

      <aside className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/[.06] p-5 text-sm leading-6 text-muted-foreground"><strong className="text-foreground">Conteúdo educacional.</strong> Os exemplos não consideram sua situação financeira, seus objetivos ou sua tolerância a risco e não constituem recomendação de investimento. Regras, impostos, garantias e condições podem mudar.</aside>
      <div className="mt-5 flex justify-end"><Link href="/analise"><Button>Praticar na análise fundamentalista</Button></Link></div>
    </div>
    {celebrate && <div role="status" className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border bg-card p-4 shadow-2xl"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><GraduationCap /></span><div className="flex-1"><p className="font-semibold">Você visitou todo o guia</p><p className="text-xs text-muted-foreground">Um ótimo começo. Volte aos blocos quando precisar.</p></div><button onClick={() => setCelebrate(false)} aria-label="Fechar aviso" className="rounded-full p-2 hover:bg-accent"><X className="h-4 w-4" /></button></div>}
  </DashboardLayout>;
}

function GoalChooser({ value, onChange }: { value: Goal | null; onChange: (goal: Goal) => void }) {
  return <section className="mt-6 rounded-2xl border bg-card p-5" aria-labelledby="goal-title"><div className="flex items-start gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Target className="h-4 w-4" /></span><div><h2 id="goal-title" className="font-semibold">O que você quer fazer primeiro?</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Sua escolha apenas organiza a ordem sugerida. Todo o conteúdo continua disponível.</p></div></div><div className="mt-4 grid gap-3 md:grid-cols-3">{(Object.entries(goals) as [Goal, typeof goals[Goal]][]).map(([key, item]) => <button key={key} type="button" aria-pressed={value === key} onClick={() => onChange(key)} className={`rounded-xl border p-4 text-left transition ${value === key ? "border-primary bg-primary/[.06] ring-1 ring-primary" : "hover:border-primary/40"}`}><span className="flex items-center justify-between font-semibold">{item.title}{value === key && <CheckCircle2 className="h-4 w-4 text-primary" />}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.description}</span></button>)}</div></section>;
}

function LearningPath({ goal, seen }: { goal: Goal; seen: Set<string> }) {
  return <section className="mt-4 rounded-2xl bg-muted/35 p-4" aria-label="Sua trilha sugerida"><p className="text-xs font-semibold uppercase tracking-[.14em] text-primary">Sua trilha sugerida</p><div className="mt-3 flex flex-wrap items-center gap-2">{goals[goal].path.map((id, index) => <span key={id} className="flex items-center gap-2"><a href={`#${id}`} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${seen.has(id) ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-card"}`}>{seen.has(id) && <Check className="mr-1 inline h-3 w-3" />}{blockLabels[id]}</a>{index < goals[goal].path.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}</span>)}</div></section>;
}

function LearningCheck({ id, completed, question, options, correct, onComplete }: { id: string; completed: boolean; question: string; options: string[]; correct: number; onComplete: (id: string) => void }) {
  const [selected, setSelected] = useState<number | null>(completed ? correct : null);
  const answered = selected !== null; const right = selected === correct;
  return <section className="mt-7 rounded-2xl border border-primary/15 bg-primary/[.035] p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-primary">Verificação de aprendizado</p><h3 className="mt-1 text-sm font-semibold">{question}</h3></div>{completed && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}</div><div className="mt-4 grid gap-2">{options.map((option, index) => <button key={option} type="button" disabled={completed} onClick={() => { setSelected(index); if (index === correct) onComplete(id); }} className={`rounded-xl border px-4 py-3 text-left text-xs transition ${answered && index === correct ? "border-emerald-500/40 bg-emerald-500/10" : answered && index === selected ? "border-rose-500/40 bg-rose-500/10" : "bg-card hover:border-primary/40"}`}>{option}</button>)}</div>{answered && <p role="status" className={`mt-3 text-xs ${right ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>{right ? "Correto. Este módulo foi concluído." : "Ainda não. Revise o conteúdo e tente outra opção."}</p>}</section>;
}

function NextStep({ goal, seen, quizzes, onOpen }: { goal: Goal | null; seen: Set<string>; quizzes: Set<string>; onOpen: (id: string) => void }) {
  const path = goal ? goals[goal].path : blockIds;
  const next = path.find(id => !seen.has(id) || !quizzes.has(id));
  if (next) return <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/[.05] p-5"><div><p className="text-xs font-semibold text-primary">Continue de onde parou</p><h2 className="mt-1 font-semibold">Próximo passo: {blockLabels[next]}</h2><p className="mt-1 text-xs text-muted-foreground">Abra o módulo e responda à verificação de aprendizado.</p></div><a href={`#${next}`} onClick={() => onOpen(next)}><Button>Continuar <ArrowRight className="ml-2 h-4 w-4" /></Button></a></section>;
  return <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/[.06] p-5"><div><p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Trilha concluída</p><h2 className="mt-1 font-semibold">Agora pratique com um ativo real</h2><p className="mt-1 text-xs text-muted-foreground">Os campos da análise são editáveis e os resultados continuam educacionais.</p></div><Link href="/analise"><Button>Ir para análise <ArrowRight className="ml-2 h-4 w-4" /></Button></Link></section>;
}

function GuideBlock({ value, icon, title, subtitle, children }: { value: string; icon: React.ReactElement; title: string; subtitle: string; children: React.ReactNode }) {
  return <AccordionItem value={value} id={value} className="scroll-mt-20 overflow-hidden rounded-2xl border bg-card px-5 shadow-sm">
    <AccordionTrigger className="py-5 hover:no-underline"><span className="flex items-start gap-3"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&>svg]:h-4 [&>svg]:w-4">{icon}</span><span><span className="block font-semibold text-foreground">{title}</span><span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">{subtitle}</span></span></span></AccordionTrigger>
    <AccordionContent className="border-t py-6">{children}</AccordionContent>
  </AccordionItem>;
}

function EmergencyFund() {
  const [expenses, setExpenses] = useState(3000); const [months, setMonths] = useState<6 | 12>(6);
  return <div className="space-y-6"><p className="leading-6 text-muted-foreground">A reserva ajuda a enfrentar imprevistos sem recorrer imediatamente a dívidas ou vender investimentos em um momento desfavorável. O tamanho depende da estabilidade da renda, dos dependentes e dos gastos essenciais.</p>
    <div className="rounded-2xl bg-muted/45 p-5"><label htmlFor="expenses" className="text-sm font-medium">Gastos essenciais por mês</label><div className="mt-2 flex items-center rounded-xl border bg-background px-3"><span className="text-muted-foreground">R$</span><Input id="expenses" inputMode="numeric" value={expenses ? expenses.toLocaleString("pt-BR") : ""} onChange={e => setExpenses(Math.min(Number(e.target.value.replace(/\D/g, "")), 1000000))} className="border-0 text-lg font-semibold shadow-none focus-visible:ring-0" /></div><Slider min={500} max={20000} step={100} value={[Math.min(expenses, 20000)]} onValueChange={v => setExpenses(v[0])} className="mt-5" aria-label="Ajustar gastos mensais" /><p className="mt-4 flex gap-2 text-xs leading-5 text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0" />Seis ou doze meses são referências educacionais, não uma regra. Considere sua realidade.</p></div>
    <div className="grid gap-3 sm:grid-cols-2">{([6, 12] as const).map(m => <button key={m} onClick={() => setMonths(m)} aria-pressed={months === m} className={`rounded-2xl border p-5 text-left transition ${months === m ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/40"}`}><span className="text-xs opacity-75">{m} meses de gastos</span><span className="mt-2 block text-3xl font-semibold">{money(expenses * m)}</span><span className="mt-1 block text-xs opacity-75">{money(expenses)} × {m}</span></button>)}</div>
    <div className="grid gap-4 sm:grid-cols-2"><InfoCard good title="O que observar" items={["Baixo risco e facilidade de resgate", "Prazo efetivo de liquidação", "Tributação, custos e limites de garantia"]} /><InfoCard title="Atenção" items={["Tesouro Selic tem baixa volatilidade, mas o resgate antecipado ocorre a preço de mercado", "No FGC, o limite considera CPF/CNPJ e conglomerado, além do teto global", "Na poupança, o rendimento é creditado na data de aniversário"]} /></div>
    <div className="flex flex-wrap gap-3"><Link href="/calculators"><Button>Usar calculadoras</Button></Link><Link href="/trust"><Button variant="outline">Entender fontes e limitações</Button></Link></div></div>;
}

function InfoCard({ good, title, items }: { good?: boolean; title: string; items: string[] }) { return <div className={`rounded-2xl border p-5 ${good ? "border-emerald-500/20 bg-emerald-500/[.06]" : "border-amber-500/20 bg-amber-500/[.06]"}`}><h3 className="flex items-center gap-2 font-semibold">{good ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-amber-600" />}{title}</h3><ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">{items.map(i => <li key={i}>• {i}</li>)}</ul></div>; }

function InvestmentTriangle() {
  const info = { Retorno: "Potencial de ganho, que não deve ser confundido com promessa. Buscar mais retorno normalmente envolve assumir algum risco adicional.", Segurança: "Probabilidade e tamanho de perdas possíveis. Segurança não significa ausência absoluta de risco.", Liquidez: "Prazo e condições para converter o ativo em dinheiro. Liquidez anunciada não elimina variação de preço." } as const;
  const [selected, setSelected] = useState<keyof typeof info>("Segurança");
  const vertices = [{ key: "Retorno", x: 150, y: 32 }, { key: "Segurança", x: 34, y: 235 }, { key: "Liquidez", x: 266, y: 235 }] as const;
  return <div><p className="leading-6 text-muted-foreground">Todo investimento combina retorno esperado, risco e liquidez. Em geral, vantagens em um critério envolvem concessões em outros; isso é uma heurística para comparar, não uma regra matemática.</p><div className="mt-5 grid items-center gap-6 md:grid-cols-2"><svg viewBox="0 0 300 275" className="mx-auto w-full max-w-xs" role="img" aria-label="Relação entre retorno, segurança e liquidez"><polygon points="150,32 34,235 266,235" fill="none" stroke="currentColor" className="text-border" strokeWidth="2" />{vertices.map(vertex => { const active = selected === vertex.key; return <g key={vertex.key} role="button" tabIndex={0} aria-pressed={active} onClick={() => setSelected(vertex.key)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") setSelected(vertex.key); }} className="cursor-pointer outline-none"><circle cx={vertex.x} cy={vertex.y} r={active ? 23 : 17} fill="currentColor" className={active ? "text-primary" : "text-muted-foreground/40"} /><text x={vertex.x} y={vertex.y === 32 ? 12 : 267} textAnchor="middle" className="fill-foreground text-[13px] font-semibold">{vertex.key}</text></g>; })}</svg><div className="rounded-2xl border bg-muted/30 p-6"><span className="text-xs font-semibold uppercase tracking-wider text-primary">Critério selecionado</span><h3 className="mt-2 text-xl font-semibold">{selected}</h3><p className="mt-2 leading-6 text-muted-foreground">{info[selected]}</p><p className="mt-4 rounded-xl bg-background p-3 text-xs leading-5 text-muted-foreground">Compare alternativas no mesmo horizonte e sob as mesmas condições.</p></div></div></div>;
}

function AssetExplorer() {
  const [tab, setTab] = useState<keyof typeof assets>("Renda fixa");
  return <div><div className="flex gap-2">{Object.keys(assets).map(k => <Button key={k} variant={tab === k ? "default" : "outline"} onClick={() => setTab(k as keyof typeof assets)}>{k}</Button>)}</div><div className="mt-5 grid gap-4 sm:grid-cols-2">{assets[tab].map(a => <article key={a.name} className="rounded-2xl border p-5"><h3 className="font-semibold">{a.name}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{a.text}</p><div className="mt-4 grid gap-3"><AssetList good items={a.pros} /><AssetList items={a.cons} /></div></article>)}</div><Link href="/markets"><Button className="mt-5">Explorar ativos no portal</Button></Link></div>;
}
function AssetList({ good, items }: { good?: boolean; items: string[] }) { return <ul className="space-y-1.5 text-xs text-muted-foreground">{items.map(i => <li className="flex gap-2" key={i}>{good ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> : <X className="h-3.5 w-3.5 shrink-0 text-rose-600" />}{i}</li>)}</ul>; }

function Allocation() {
  const [profile, setProfile] = useState<keyof typeof allocations>("Moderado"); const selected = allocations[profile];
  const colors = ["#1eb673", "#0ea5e9", "#8b5cf6", "#f59e0b"]; let accumulated = 0;
  const gradient = selected.slices.map(([, percent], index) => { const start = accumulated; accumulated += percent; return `${colors[index]} ${start}% ${accumulated}%`; }).join(", ");
  return <div><p className="leading-6 text-muted-foreground">Não existe uma composição universal. Os exemplos abaixo servem apenas para visualizar como diferentes tolerâncias a oscilações podem mudar uma distribuição.</p><div className="mt-5 flex flex-wrap gap-2">{Object.keys(allocations).map(k => <Button key={k} variant={profile === k ? "default" : "outline"} onClick={() => setProfile(k as keyof typeof allocations)}>{k}</Button>)}</div><div className="mt-5 grid items-center gap-8 rounded-2xl border p-5 md:grid-cols-2"><div className="relative mx-auto h-52 w-52 rounded-full transition-all" style={{ background: `conic-gradient(${gradient})` }} role="img" aria-label={`Distribuição educacional ${profile}`}><div className="absolute inset-[28%] flex flex-col items-center justify-center rounded-full bg-card"><span className="text-xs text-muted-foreground">Exemplo</span><strong>{profile}</strong></div></div><div><h3 className="text-xl font-semibold">{profile}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{selected.description}</p><ul className="mt-4 space-y-2">{selected.slices.map(([name, percent], index) => <li className="flex items-center gap-3 text-sm" key={name}><span className="h-3 w-3 rounded-sm" style={{ backgroundColor: colors[index] }} /><span className="flex-1">{name}</span><strong>{percent}%</strong></li>)}</ul><p className="mt-4 text-xs font-medium text-amber-700 dark:text-amber-300">Exemplo didático — não é recomendação nem classificação do seu perfil.</p></div></div><Link href="/portfolio"><Button className="mt-5">Organizar minha carteira manual</Button></Link></div>;
}

function Dictionary() {
  const [query, setQuery] = useState(""); const filtered = useMemo(() => glossary.filter(([term, definition]) => `${term} ${definition}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const popular = ["Selic", "CDI", "Dividend Yield", "Liquidez", "Volatilidade"];
  return <div><p className="mb-4 leading-6 text-muted-foreground">Encontrou uma palavra estranha? Busque aqui por nome ou definição.</p><Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar termo, por exemplo: liquidez" aria-label="Buscar termo no dicionário" />{!query && <div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">Populares:</span>{popular.map(term => <Button key={term} size="sm" variant="outline" className="h-7 rounded-full text-xs" onClick={() => setQuery(term)}>{term}</Button>)}</div>}<p className="mt-4 text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? "termo encontrado" : "termos encontrados"}</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{filtered.map(([term, definition, example]) => <article key={term} className="rounded-xl border p-4"><h3 className="font-semibold text-primary">{term}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{definition}</p>{example && <p className="mt-3 rounded-lg bg-muted/50 p-3 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Exemplo: </strong>{example}</p>}</article>)}</div>{!filtered.length && <div className="py-8 text-center"><BookOpen className="mx-auto h-6 w-6 text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">Nenhum termo encontrado.</p><Button className="mt-3" size="sm" variant="outline" onClick={() => setQuery("")}>Limpar busca</Button></div>}</div>;
}
