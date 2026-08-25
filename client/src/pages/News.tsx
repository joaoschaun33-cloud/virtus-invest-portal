import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  CalendarDays,
  ExternalLink,
  FileText,
  Newspaper,
  Search,
  ShieldCheck,
  Radio,
  Info,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { AppTopBar, PageHeader, Panel } from "@/components/apex/ApexPrimitives";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  formatDate,
  formatPlainText,
  formatRelativeDate,
} from "@/lib/formatters";

const categories = [
  "Todas",
  "Mercado",
  "Empresas",
  "Macro",
  "Regulação",
  "Cripto",
  "Proventos",
];

export default function News() {
  const [category, setCategory] = useState("Todas");
  const [search, setSearch] = useState("");
  const newsQuery = trpc.market.news.useQuery(
    { category: category === "Todas" ? undefined : category },
    { refetchInterval: 90000 }
  );
  const calendarQuery = trpc.market.calendar.useQuery(undefined, {
    refetchInterval: 90000,
  });
  const editorialStatusQuery = trpc.market.editorialStatus.useQuery(undefined, {
    refetchInterval: 90000,
  });
  const newsIsDemo = editorialStatusQuery.data?.newsIsDemo ?? true;
  const calendarIsDemo = editorialStatusQuery.data?.calendarIsDemo ?? true;
  const news = useMemo(
    () =>
      (newsQuery.data ?? []).filter(
        item =>
          !search ||
          `${item.title} ${formatPlainText(item.summary)}`
            .toLowerCase()
            .includes(search.toLowerCase())
      ),
    [newsQuery.data, search]
  );

  return (
    <DashboardLayout allowAnonymous>
      <AppTopBar title="Notícias & Calendário" />
      <div className="container min-w-0 overflow-x-hidden pb-12">
        <PageHeader
          eyebrow="Agregador editorial"
          title="Fatos e prazos sem ruído."
          description="Acompanhe divulgações, resultados e calendário macroeconômico agregados com total transparência de fontes e sem recomendações automáticas."
          actions={
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-300">
                <Radio className="h-3 w-3 animate-pulse" />
                Dados identificados por fonte e horário de referência
              </span>
            </div>
          }
        />

        <div className="mb-6 rounded-2xl border border-border/70 bg-card/60 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold tracking-tight">
                Compliance editorial e transparência
              </h2>
              <p className="text-xs leading-relaxed text-muted-foreground">
                O Virtus organiza títulos, resumos e links de fontes públicas,
                preservando a atribuição e o acesso ao conteúdo original. Não
                republicamos artigos na íntegra; o feed possui caráter
                estritamente informativo.
              </p>
            </div>
          </div>
        </div>

        {newsIsDemo && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs leading-5 text-amber-800 dark:text-amber-200">
            <Info className="h-4 w-4 shrink-0" />
            <span>
              <strong>Notícias temporariamente indisponíveis.</strong> Nenhuma
              fonte editorial respondeu; não exibimos conteúdo substituto.
            </span>
          </div>
        )}

        {(newsQuery.isError ||
          calendarQuery.isError ||
          editorialStatusQuery.isError) && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-xs text-rose-700 dark:text-rose-300"
          >
            Não foi possível atualizar parte do conteúdo editorial agora. Os
            dados disponíveis permanecem identificados por sua origem.
          </div>
        )}

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,.7fr)]">
          <div className="min-w-0">
            <Panel className="mb-5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Buscar notícias e eventos"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Buscar no feed"
                    className="h-10 min-w-0 max-w-full rounded-xl pl-10"
                  />
                </div>
                <div className="flex items-center gap-1 overflow-x-auto">
                  {categories.map(item => (
                    <button
                      key={item}
                      onClick={() => setCategory(item)}
                      className={`whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-semibold transition ${category === item ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </Panel>

            <div className="space-y-3">
              {news.map(item => (
                <div
                  key={item.id}
                  className="group block"
                >
                  <Panel className="p-5 transition duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/30">
                    <a href={item.url} target="_blank" rel="noreferrer" className="block">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.12em] text-primary">
                          <span>{item.category}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">
                            {item.sourceName === "catalog"
                              ? "Indisponível"
                              : item.sourceName}
                          </span>
                        </div>
                        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                      </div>
                      <h2 className="mt-3 max-w-2xl text-base font-semibold leading-6 tracking-[-.02em] group-hover:text-primary">
                        {item.title}
                      </h2>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {formatPlainText(item.summary) ||
                          "Leia a notícia completa na fonte oficial."}
                      </p>
                    </a>
                    <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{formatRelativeDate(item.publishedAt)}</span>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {(item.relatedTickers ?? []).map(ticker => (
                          <Link
                            key={ticker}
                            href={`/asset/${encodeURIComponent(ticker)}`}
                            className="rounded-full bg-primary/10 px-2 py-1 font-semibold text-primary transition hover:bg-primary/20"
                          >
                            {ticker}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </Panel>
                </div>
              ))}
              {!news.length && (
                <Panel className="p-10 text-center text-sm text-muted-foreground">
                  Nenhuma notícia corresponde ao filtro.
                </Panel>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <Panel className="overflow-hidden">
              <div className="flex items-center gap-3 border-b border-border/60 px-5 py-4">
                <CalendarDays className="h-4 w-4 text-primary" />
                <div>
                  <h2 className="section-heading">Calendário</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Próximos eventos relevantes.
                  </p>
                  {calendarIsDemo ? (
                    <span className="mt-2 inline-flex rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                      Temporariamente indisponível
                    </span>
                  ) : (
                    <span className="mt-2 inline-flex rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                      Fonte:{" "}
                      {editorialStatusQuery.data?.calendarSource === "bcb"
                        ? "Banco Central do Brasil"
                        : editorialStatusQuery.data?.calendarSource}
                    </span>
                  )}
                </div>
              </div>
              <div className="divide-y divide-border/60">
                {(calendarQuery.data ?? []).map(item => (
                  <div key={item.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <span className="text-xs font-bold">
                          {formatDate(item.eventDate, { day: "2-digit" })}
                        </span>
                        <span className="text-[9px] uppercase">
                          {formatDate(item.eventDate, { month: "short" })}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{item.title}</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${item.importance === "HIGH" ? "bg-rose-500/10 text-rose-600 dark:text-rose-300" : "bg-muted text-muted-foreground"}`}
                          >
                            {item.importance === "HIGH" ? "Alta" : "Normal"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.category} · {item.country}
                        </p>
                        {(item.previous || item.forecast) && (
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            {item.previous && `Anterior: ${item.previous}`}
                            {item.previous && item.forecast && " · "}
                            {item.forecast && `Consenso: ${item.forecast}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {!calendarQuery.data?.length && (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Sem eventos no período.
                  </div>
                )}
              </div>
            </Panel>

            <Panel className="p-5">
              <Newspaper className="h-5 w-5 text-primary" />
              <h2 className="mt-3 section-heading">Sobre este feed</h2>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                O portal organiza links e metadados para consulta. Não republica
                integralmente conteúdos de terceiros e deve operar apenas com
                fontes licenciadas ou permitidas pelos respectivos termos.
              </p>
            </Panel>
            <Panel className="p-5">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="mt-3 section-heading">Documentos oficiais</h2>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Para validar uma empresa ou fundo, consulte os registros
                primários — em vez de depender apenas de resumos de mercado.
              </p>
              <div className="mt-4 space-y-2">
                <OfficialLink
                  href="https://dados.cvm.gov.br/dataset/?groups=companhias"
                  label="Companhias abertas"
                  detail="Cadastros, demonstrações e divulgações da CVM"
                />
                <OfficialLink
                  href="https://dados.cvm.gov.br/dataset/cia_aberta-doc-fre"
                  label="Formulário de referência"
                  detail="Riscos, administração e estrutura de capital"
                />
                <OfficialLink
                  href="https://dados.cvm.gov.br/dataset/?groups=fundos-de-investimento"
                  label="Fundos de investimento"
                  detail="Informes e documentos regulatórios"
                />
              </div>
              <p className="mt-4 text-[10px] leading-4 text-muted-foreground">
                Links externos da CVM. O Virtus não altera nem replica os
                documentos.
              </p>
            </Panel>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function OfficialLink({
  href,
  label,
  detail,
}: {
  href: string;
  label: string;
  detail: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/35 p-3 transition hover:border-primary/30 hover:bg-accent/40"
    >
      <span>
        <span className="block text-xs font-semibold group-hover:text-primary">
          {label}
        </span>
        <span className="mt-1 block text-[10px] leading-4 text-muted-foreground">
          {detail}
        </span>
      </span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
    </a>
  );
}
