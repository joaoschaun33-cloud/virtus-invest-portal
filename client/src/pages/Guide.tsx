import DashboardLayout from "@/components/DashboardLayout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { BookOpen, Check, GraduationCap, Info, PieChart, ShieldCheck, Triangle, WalletCards, X, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";

const STORAGE_KEY = "virtus-guide-progress-v1";
const blockIds = ["reserva", "triangulo", "ativos", "carteira", "dicionario"];

const assets = {
  "Renda fixa": [
    { name: "Tesouro Selic", text: "Título público cuja rentabilidade acompanha a Selic. Tem baixa volatilidade e costuma ser usado para objetivos de curto prazo.", pros: ["Garantia do Tesouro Nacional", "Liquidez diária em condições normais"], cons: ["Resgate antecipado ocorre a preço de mercado", "Há tributação e custos conforme as regras vigentes"] },
    { name: "Tesouro IPCA+", text: "Combina a variação do IPCA com uma taxa contratada e é voltado a objetivos de prazo mais longo.", pros: ["Proteção do poder de compra se levado ao vencimento", "Útil para objetivos com data definida"], cons: ["Pode oscilar bastante antes do vencimento", "Não é apropriado para reserva de emergência"] },
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
  ["CDI", "Taxa de referência das operações entre bancos, muito usada como régua para investimentos de renda fixa."],
  ["Diversificação", "Distribuição dos recursos entre ativos e riscos diferentes para reduzir a dependência de uma única posição."],
  ["Dividend Yield", "Relação entre os proventos distribuídos e o preço do ativo em determinado período."],
  ["FGC", "Fundo Garantidor de Créditos. Produtos elegíveis têm cobertura de até R$ 250 mil por CPF ou CNPJ e conglomerado, respeitado o teto de R$ 1 milhão em quatro anos."],
  ["IPCA", "Índice oficial usado como referência para medir a inflação ao consumidor no Brasil."],
  ["Liquidez", "Facilidade e prazo para transformar um investimento em dinheiro, considerando as condições de resgate."],
  ["Marcação a mercado", "Atualização do preço de um ativo conforme as condições atuais do mercado."],
  ["P/L", "Preço da ação dividido pelo lucro por ação. É uma relação histórica, não uma previsão de retorno."],
  ["Renda fixa", "Investimentos cujas regras de remuneração são definidas na contratação, embora preço e retorno possam variar em algumas situações."],
  ["Renda variável", "Ativos cujo preço e retorno não são conhecidos antecipadamente e podem gerar perdas."],
  ["ROE", "Indicador que relaciona o lucro de uma empresa ao seu patrimônio líquido."],
  ["Selic", "Taxa básica de juros da economia brasileira, definida pelo Copom."],
  ["Volatilidade", "Medida da intensidade das oscilações de preço de um ativo."],
  ["Yield", "Rendimento de um ativo em relação ao seu preço, calculado segundo um período e uma metodologia."],
] as const;

function money(value: number) { return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }); }

export default function Guide() {
  const [seen, setSeen] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[\"reserva\"]")); } catch { return new Set(["reserva"]); }
  });
  const [open, setOpen] = useState<string[]>(["reserva"]);
  const [celebrate, setCelebrate] = useState(false);
  const celebrated = useRef(seen.size === blockIds.length);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(seen))); }, [seen]);
  function changeOpen(values: string[]) {
    setOpen(values);
    setSeen(previous => {
      const next = new Set(previous); values.forEach(value => next.add(value));
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

      <div className="mt-6 flex items-center gap-3" aria-label={`${seen.size} de 5 blocos visitados`}>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${seen.size * 20}%` }} /></div>
        <span className="text-xs font-medium text-muted-foreground">{seen.size} de 5 blocos</span>
      </div>

      <Accordion type="multiple" value={open} onValueChange={changeOpen} className="mt-5 space-y-4">
        <GuideBlock value="reserva" icon={<ShieldCheck />} title="Reserva de emergência" subtitle="Estime sua proteção e entenda os critérios para guardar esse dinheiro."><EmergencyFund /></GuideBlock>
        <GuideBlock value="triangulo" icon={<Triangle />} title="Risco, retorno e liquidez" subtitle="Entenda os três critérios que se combinam em todo investimento."><InvestmentTriangle /></GuideBlock>
        <GuideBlock value="ativos" icon={<WalletCards />} title="Tipos de ativos" subtitle="Conheça renda fixa e renda variável, com vantagens e riscos."><AssetExplorer /></GuideBlock>
        <GuideBlock value="carteira" icon={<PieChart />} title="Exemplos de composição" subtitle="Visualizações educacionais para diferentes tolerâncias a oscilações."><Allocation /></GuideBlock>
        <GuideBlock value="dicionario" icon={<BookOpen />} title="Dicionário do investidor" subtitle="Consulte rapidamente os termos encontrados no portal."><Dictionary /></GuideBlock>
      </Accordion>

      <aside className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/[.06] p-5 text-sm leading-6 text-muted-foreground"><strong className="text-foreground">Conteúdo educacional.</strong> Os exemplos não consideram sua situação financeira, seus objetivos ou sua tolerância a risco e não constituem recomendação de investimento. Regras, impostos, garantias e condições podem mudar.</aside>
    </div>
    {celebrate && <div role="status" className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border bg-card p-4 shadow-2xl"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><GraduationCap /></span><div className="flex-1"><p className="font-semibold">Você visitou todo o guia</p><p className="text-xs text-muted-foreground">Um ótimo começo. Volte aos blocos quando precisar.</p></div><button onClick={() => setCelebrate(false)} aria-label="Fechar aviso" className="rounded-full p-2 hover:bg-accent"><X className="h-4 w-4" /></button></div>}
  </DashboardLayout>;
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
  const info = { Retorno: "Potencial de ganho, que não deve ser confundido com promessa.", Segurança: "Probabilidade e tamanho de perdas possíveis.", Liquidez: "Prazo e condições para converter o ativo em dinheiro." } as const;
  const [selected, setSelected] = useState<keyof typeof info>("Segurança");
  return <div className="grid items-center gap-6 md:grid-cols-2"><div><p className="leading-6 text-muted-foreground">Todo investimento combina retorno esperado, risco e liquidez. Em geral, vantagens em um critério envolvem concessões em outros; isso é uma heurística para comparar, não uma regra matemática.</p><div className="mt-5 flex flex-wrap gap-2">{Object.keys(info).map(k => <Button key={k} variant={selected === k ? "default" : "outline"} onClick={() => setSelected(k as keyof typeof info)}>{k}</Button>)}</div></div><div className="rounded-2xl border bg-muted/30 p-6"><span className="text-xs font-semibold uppercase tracking-wider text-primary">Critério selecionado</span><h3 className="mt-2 text-xl font-semibold">{selected}</h3><p className="mt-2 leading-6 text-muted-foreground">{info[selected]}</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full w-2/3 rounded-full bg-primary" /></div></div></div>;
}

function AssetExplorer() {
  const [tab, setTab] = useState<keyof typeof assets>("Renda fixa");
  return <div><div className="flex gap-2">{Object.keys(assets).map(k => <Button key={k} variant={tab === k ? "default" : "outline"} onClick={() => setTab(k as keyof typeof assets)}>{k}</Button>)}</div><div className="mt-5 grid gap-4 sm:grid-cols-2">{assets[tab].map(a => <article key={a.name} className="rounded-2xl border p-5"><h3 className="font-semibold">{a.name}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{a.text}</p><div className="mt-4 grid gap-3"><AssetList good items={a.pros} /><AssetList items={a.cons} /></div></article>)}</div><Link href="/markets"><Button className="mt-5">Explorar ativos no portal</Button></Link></div>;
}
function AssetList({ good, items }: { good?: boolean; items: string[] }) { return <ul className="space-y-1.5 text-xs text-muted-foreground">{items.map(i => <li className="flex gap-2" key={i}>{good ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> : <X className="h-3.5 w-3.5 shrink-0 text-rose-600" />}{i}</li>)}</ul>; }

function Allocation() {
  const [profile, setProfile] = useState<keyof typeof allocations>("Moderado"); const selected = allocations[profile];
  return <div><p className="leading-6 text-muted-foreground">Não existe uma composição universal. Os exemplos abaixo servem apenas para visualizar como diferentes tolerâncias a oscilações podem mudar uma distribuição.</p><div className="mt-5 flex flex-wrap gap-2">{Object.keys(allocations).map(k => <Button key={k} variant={profile === k ? "default" : "outline"} onClick={() => setProfile(k as keyof typeof allocations)}>{k}</Button>)}</div><div className="mt-5 grid gap-6 rounded-2xl border p-5 md:grid-cols-[1fr_1.2fr]"><div><h3 className="text-xl font-semibold">{profile}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{selected.description}</p><p className="mt-4 text-xs font-medium text-amber-700 dark:text-amber-300">Exemplo didático — não é recomendação nem perfil de investidor.</p></div><div className="space-y-3">{selected.slices.map(([name, percent]) => <div key={name}><div className="mb-1 flex justify-between text-xs"><span>{name}</span><strong>{percent}%</strong></div><div className="h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} /></div></div>)}</div></div><Link href="/portfolio"><Button className="mt-5">Organizar minha carteira manual</Button></Link></div>;
}

function Dictionary() {
  const [query, setQuery] = useState(""); const filtered = useMemo(() => glossary.filter(([term, definition]) => `${term} ${definition}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return <div><Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar termo, por exemplo: liquidez" aria-label="Buscar termo no dicionário" /><div className="mt-5 grid gap-3 sm:grid-cols-2">{filtered.map(([term, definition]) => <article key={term} className="rounded-xl border p-4"><h3 className="font-semibold">{term}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{definition}</p></article>)}</div>{!filtered.length && <p className="py-8 text-center text-sm text-muted-foreground">Nenhum termo encontrado.</p>}</div>;
}
