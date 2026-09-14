import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Globe2,
  Landmark,
  Layers3,
  Newspaper,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  WalletCards,
  Zap,
  ShieldAlert,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  AppTopBar,
  AssetLink,
  LiveBadge,
  MetricCard,
  PageHeader,
  Panel,
} from "@/components/apex/ApexPrimitives";
import { useMarketRealtime } from "@/hooks/useMarketRealtime";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import {
  formatCompact,
  formatDate,
  formatMarketValue,
  formatPercent,
  formatPrice,
  formatRelativeDate,
  numberValue,
  optionalNumberValue,
} from "@/lib/formatters";
import { useAuth } from "@/_core/hooks/useAuth";
import { DataProvenance } from "@/components/DataProvenance";
import { Button } from "@/components/ui/button";

const tickerDefaults = ["IBOV", "SPX", "IXIC", "BTC/USD", "BZ=F"];
const dashboardOrderKey = "virtus-dashboard-order-v1";
const defaultWidgetOrder = ["watchlist", "news", "calendar"];

function readWidgetOrder() {
  try {
    const parsed = JSON.parse(localStorage.getItem(dashboardOrderKey) ?? "[]");
    return Array.isArray(parsed) &&
      parsed.length === defaultWidgetOrder.length &&
      defaultWidgetOrder.every(item => parsed.includes(item))
      ? parsed
      : defaultWidgetOrder;
  } catch {
    return defaultWidgetOrder;
  }
}
const tickerLabels: Record<string, string> = {
  IBOV: "Ibovespa",
  SPX: "S&P 500",
  IXIC: "Nasdaq",
  "BTC/USD": "Bitcoin",
  "BZ=F": "Brent",
};

function changeClass(change: unknown) {
  if (optionalNumberValue(change) === null) return "text-muted-foreground";
  return numberValue(change) >= 0
    ? "text-emerald-700 dark:text-emerald-300"
    : "text-rose-700 dark:text-rose-300";
}

export default function Home() {
  const { user } = useAuth();
  const [widgetOrder, setWidgetOrder] = useState<string[]>(readWidgetOrder);
  const preferencesQuery = trpc.portfolio.preferences.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const savePreferences = trpc.portfolio.savePreferences.useMutation();

  useEffect(() => {
    if (!preferencesQuery.data?.dashboardLayout) return;
    try {
      const parsed: unknown = JSON.parse(preferencesQuery.data.dashboardLayout);
      if (
        Array.isArray(parsed) &&
        parsed.length === defaultWidgetOrder.length &&
        defaultWidgetOrder.every(item => parsed.includes(item))
      ) {
        setWidgetOrder(parsed);
        localStorage.setItem(dashboardOrderKey, JSON.stringify(parsed));
      }
    } catch {
      // Ignore preferences created by older portal versions.
    }
  }, [preferencesQuery.data?.dashboardLayout]);

  const moveWidget = (widget: string, direction: -1 | 1) => {
    setWidgetOrder(current => {
      const index = current.indexOf(widget);
      const nextIndex = Math.max(
        0,
        Math.min(current.length - 1, index + direction)
      );
      if (index === nextIndex) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      localStorage.setItem(dashboardOrderKey, JSON.stringify(next));
      if (user)
        savePreferences.mutate({ dashboardLayout: JSON.stringify(next) });
      return next;
    });
  };
  const assetsQuery = trpc.market.assets.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const newsQuery = trpc.market.news.useQuery(undefined, {
    refetchInterval: 90000,
  });
  const calendarQuery = trpc.market.calendar.useQuery(undefined, {
    refetchInterval: 90000,
  });
  const providerStatus = trpc.market.providerStatus.useQuery();
  const macroBriefQuery = trpc.market.macroBrief.useQuery(undefined, {
    staleTime: 15 * 60_000,
    refetchInterval: 20 * 60_000,
  });
  const dataQualityQuery = trpc.market.dataQuality.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const editorialStatusQuery = trpc.market.editorialStatus.useQuery(undefined, {
    refetchInterval: 90000,
  });
  const watchlistQuery = trpc.portfolio.watchlist.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const { quotes: realtimeQuotes, connected } =
    useMarketRealtime(tickerDefaults);
  const assets = assetsQuery.data ?? [];
  const indexByTicker = new Map(
    tickerDefaults.map(ticker => [
      ticker,
      assets.find(asset => asset.ticker === ticker),
    ])
  );
  const indices = tickerDefaults
    .map(ticker => indexByTicker.get(ticker))
    .filter((asset): asset is (typeof assets)[number] => Boolean(asset));
  const marketMetrics = [
    {
      ticker: "IBOV",
      label: "Ibovespa",
      currency: "BRL",
      note: "Fechamento de referência",
      accent: "blue" as const,
    },
    {
      ticker: "SPX",
      label: "S&P 500",
      currency: "USD",
      note: "Mercado internacional",
    },
    {
      ticker: "BTC/USD",
      label: "Bitcoin",
      currency: "USD",
      note: "Cripto · 24 horas",
      accent: "orange" as const,
    },
    {
      ticker: "BZ=F",
      label: "Brent",
      currency: "USD",
      note: "Commodities",
    },
  ].flatMap(metric => {
    const asset = indexByTicker.get(metric.ticker);
    return asset && asset.price !== null ? [{ ...metric, asset }] : [];
  });
  const gainers = [...assets]
    .filter(asset => optionalNumberValue(asset.changePercent) !== null)
    .sort((a, b) => numberValue(b.changePercent) - numberValue(a.changePercent))
    .slice(0, 4);
  const losers = [...assets]
    .filter(asset => optionalNumberValue(asset.changePercent) !== null)
    .sort((a, b) => numberValue(a.changePercent) - numberValue(b.changePercent))
    .slice(0, 4);
  const volumes = [...assets]
    .filter(asset => optionalNumberValue(asset.volume) !== null)
    .sort((a, b) => numberValue(b.volume) - numberValue(a.volume))
    .slice(0, 4);
  const watchlist =
    watchlistQuery.data?.map(item => item.asset) ??
    assets.filter(asset => ["PETR4", "VALE3", "HGLG11"].includes(asset.ticker));
  const hasMarketProvider = Boolean(
    providerStatus.data?.brapi ||
      providerStatus.data?.twelveData ||
      providerStatus.data?.finnhub ||
      providerStatus.data?.coinGecko ||
      providerStatus.data?.eodhd
  );
  const isDemo = dataQualityQuery.data?.isDemo ?? !hasMarketProvider;
  const isCatalogFallback =
    assets.length > 0 && assets.every(asset => asset.source === "catalog");
  const catalogAssets = assets.filter(asset => asset.source === "catalog");
  const realAssets = assets.length - catalogAssets.length;
  const editorialIsDemo =
    (editorialStatusQuery.data?.newsIsDemo ?? true) &&
    (editorialStatusQuery.data?.calendarIsDemo ?? true);
  const marketQualityResolved =
    !assetsQuery.isLoading &&
    !providerStatus.isLoading &&
    !dataQualityQuery.isLoading;
  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      }).format(new Date()),
    []
  );

  const tickerItems = useMemo(() => {
    if (!assets.length) return [];
    const unique = new Map<string, (typeof assets)[number]>();
    indices.forEach(a => a && unique.set(a.ticker, a));
    gainers.forEach(a => unique.set(a.ticker, a));
    losers.forEach(a => unique.set(a.ticker, a));
    assets.forEach(a => unique.set(a.ticker, a));
    return Array.from(unique.values()).filter(asset => asset.price !== null);
  }, [assets, gainers, indices, losers]);

  return (
    <DashboardLayout allowAnonymous>
      <AppTopBar title="Visão geral" />
      <div className="container pb-12">
        <div className="mb-5 -mx-2 overflow-hidden rounded-xl border border-border/60 bg-card/45 backdrop-blur">
          <div className="flex overflow-hidden select-none">
            <div className="animate-ticker-marquee flex items-center divide-x divide-border/50">
              {tickerItems.length > 0 ? (
                [...tickerItems, ...tickerItems].map((asset, index) => {
                  const live = realtimeQuotes[asset.ticker];
                  const price = live?.price ?? asset.price;
                  const change = live?.changePercent ?? asset.changePercent;
                  return (
                    <Link
                      href={`/asset/${encodeURIComponent(asset.ticker)}`}
                      key={`${asset.ticker}-${index}`}
                      className="group flex shrink-0 items-center gap-3 px-4 py-2.5 transition hover:bg-accent/70"
                    >
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {tickerLabels[asset.ticker] ?? asset.ticker}
                      </span>
                      <span className="text-xs font-semibold tabular-nums">
                        {formatMarketValue(
                          price,
                          asset.assetType,
                          asset.currency
                        )}
                      </span>
                      <span
                        className={`text-[11px] font-semibold tabular-nums ${changeClass(change)}`}
                      >
                        {optionalNumberValue(change) !== null &&
                        numberValue(change) >= 0
                          ? "+"
                          : ""}
                        {formatPercent(change)}
                      </span>
                    </Link>
                  );
                })
              ) : (
                <div className="px-4 py-2.5 text-xs text-muted-foreground">
                  Carregando cotações de mercado...
                </div>
              )}
            </div>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card/90 via-card/50 to-primary/[0.04] p-8 sm:p-12 shadow-sm">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="relative max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Workspace analítico
              independente
            </span>
            <h1 className="text-3xl font-semibold tracking-[-0.045em] sm:text-5xl text-balance">
              Clareza para cada decisão de análise.
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Um workspace informativo para acompanhar mercados, entender
              movimentos e organizar sua própria leitura — sem ruído, sem
              corretagem e sem recomendações automáticas.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/markets">
                <Button className="rounded-xl px-5 py-6 text-sm font-semibold shadow-sm">
                  Explorar mercados <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/guia">
                <Button
                  variant="outline"
                  className="rounded-xl px-5 py-6 text-sm font-semibold"
                >
                  Sou iniciante: começar pelo guia
                </Button>
              </Link>
              <Link href="/screener">
                <Button
                  variant="outline"
                  className="rounded-xl px-5 py-6 text-sm font-semibold"
                >
                  Screener de ativos
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <GuideContinuation />

        {macroBriefQuery.isLoading && (
          <Panel
            className="mt-6 min-h-[680px] overflow-hidden sm:min-h-[240px]"
            aria-busy="true"
          >
            <div className="border-b border-border/60 px-5 py-4">
              <div className="h-3 w-28 animate-pulse rounded bg-primary/15" />
              <div className="mt-3 h-5 w-40 animate-pulse rounded bg-muted" />
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-3">
              {[0, 1, 2].map(item => (
                <div
                  key={item}
                  className="h-32 animate-pulse rounded-xl bg-muted/60"
                />
              ))}
            </div>
            <span className="sr-only">Carregando cenário econômico</span>
          </Panel>
        )}

        {macroBriefQuery.data && (
          <Panel className="mt-6 min-h-[680px] overflow-hidden sm:min-h-[240px]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Landmark className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Cenário econômico
                  </p>
                  <h2 className="mt-1 section-heading">Brasil em contexto</h2>
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Fonte: {macroBriefQuery.data.source}
              </span>
            </div>
            {macroBriefQuery.data.indicators.length ? (
              <>
                <div className="grid divide-y divide-border/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  {macroBriefQuery.data.indicators.map(indicator => (
                    <div key={indicator.id} className="p-5">
                      <p className="text-xs font-medium text-muted-foreground">
                        {indicator.label}
                      </p>
                      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
                        {indicator.unit === "currency"
                          ? formatPrice(indicator.value, "BRL")
                          : `${indicator.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {indicator.detail}
                      </p>
                      <div className="mt-2">
                        <DataProvenance
                          source={indicator.source}
                          asOf={indicator.asOf}
                          freshness="official"
                          compact
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border/60 bg-muted/20 px-5 py-3 text-xs leading-5 text-muted-foreground">
                  {macroBriefQuery.data.summary}
                </div>
              </>
            ) : (
              <div className="p-5 text-xs text-muted-foreground">
                Os indicadores oficiais estão temporariamente indisponíveis.
                Tente novamente em instantes.
              </div>
            )}
          </Panel>
        )}

        {!macroBriefQuery.isLoading && !macroBriefQuery.data && (
          <Panel className="mt-6 min-h-[680px] p-5 sm:min-h-[240px]">
            <h2 className="section-heading">Brasil em contexto</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              O cenário econômico está temporariamente indisponível. Nenhum
              indicador anterior será apresentado como atual.
            </p>
          </Panel>
        )}

        {marketQualityResolved &&
          (isDemo || isCatalogFallback || catalogAssets.length > 0) && (
            <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-5 py-4 text-xs text-amber-800 dark:text-amber-200">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  <strong>Cobertura de mercado identificada.</strong>{" "}
                  {realAssets > 0
                    ? `${realAssets} de ${assets.length} ativos têm uma fonte ativa. ${catalogAssets.map(asset => asset.ticker).join(", ")} estão sem cobertura e não exibem valores.`
                    : "Os ativos desta página estão sem cobertura de mercado no momento."}
                </span>
              </div>
              <span className="shrink-0 font-mono text-[11px] font-semibold text-amber-900 dark:text-amber-100">
                {realAssets > 0 ? "Cobertura parcial" : "Dados indisponíveis"}
              </span>
            </div>
          )}

        <section className="mt-8" aria-labelledby="painel-do-dia-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                Radar Virtus
              </p>
              <h2 id="painel-do-dia-title" className="mt-1 section-heading">
                O que merece sua atenção hoje
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {today.charAt(0).toUpperCase() + today.slice(1)} · organize a
                leitura antes de tomar qualquer decisão.
              </p>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {editorialIsDemo
                ? "Conteúdo editorial de referência"
                : "Fontes externas organizadas pelo Virtus"}
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {widgetOrder.map((widget, index) => (
              <EditorialWidget
                key={widget}
                widget={widget}
                index={index}
                total={widgetOrder.length}
                onMove={moveWidget}
                news={newsQuery.data ?? []}
                calendar={calendarQuery.data ?? []}
                watchlist={watchlist}
                signedIn={Boolean(user)}
              />
            ))}
          </div>
        </section>

        {assetsQuery.isError && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/[0.06] p-4 text-xs text-rose-700 dark:text-rose-300"
          >
            Não foi possível carregar o catálogo de ativos agora. Tente
            novamente em instantes.
          </div>
        )}

        <div className="mt-8 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))]">
          {marketMetrics.map(metric => (
            <MetricCard
              key={metric.ticker}
              label={metric.label}
              value={metric.asset.price}
              change={optionalNumberValue(metric.asset.changePercent)}
              currency={metric.currency}
              assetType={metric.asset.assetType}
              note={metric.note}
              accent={metric.accent}
              footer={
                <DataProvenance
                  source={metric.asset.source}
                  asOf={metric.asset.fetchedAt}
                  freshness={metric.asset.freshness}
                  compact
                />
              }
            />
          ))}
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,.85fr)]">
          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
              <div>
                <h2 className="section-heading">Pulso do mercado</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Movimentos relevantes do universo acompanhado.
                </p>
              </div>
              <Link
                href="/markets"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
              >
                Ver mercados <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid md:grid-cols-3">
              <MarketList
                title="Maiores altas"
                icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
                data={gainers}
              />
              <MarketList
                title="Maiores baixas"
                icon={<TrendingDown className="h-4 w-4 text-rose-500" />}
                data={losers}
                negative
              />
              <MarketList
                title="Mais negociados"
                icon={<Zap className="h-4 w-4 text-orange-500" />}
                data={volumes}
                volume
              />
            </div>
          </Panel>
          <Panel className="flex flex-col p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Sua leitura
                </p>
                <h2 className="mt-2 section-heading">
                  O essencial em um só lugar
                </h2>
              </div>
              <Layers3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-6 space-y-4">
              <InsightRow
                number="01"
                title="Observe o contexto"
                text="Combine preço, volume e agenda antes de formar sua própria análise."
              />
              <InsightRow
                number="02"
                title="Compare com calma"
                text="Coloque até quatro ativos lado a lado com os mesmos indicadores."
              />
              <InsightRow
                number="03"
                title="Registre sua jornada"
                text="A carteira manual transforma decisões passadas em histórico legível."
              />
            </div>
            <Link
              href="/calculators"
              className="mt-auto pt-6 text-xs font-semibold text-primary"
            >
              Abrir ferramentas analíticas{" "}
              <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
            </Link>
          </Panel>
        </div>
      </div>
    </DashboardLayout>
  );
}

function GuideContinuation() {
  const state = useMemo(() => {
    try {
      const goal = localStorage.getItem("virtus-guide-goal-v1");
      const seen = JSON.parse(
        localStorage.getItem("virtus-guide-progress-v1") ?? "[]"
      ) as string[];
      const quizzes = JSON.parse(
        localStorage.getItem("virtus-guide-quizzes-v1") ?? "[]"
      ) as string[];
      if (!goal && !seen.length) return null;
      const total = 5;
      return { completed: quizzes.length, visited: seen.length, total };
    } catch {
      return null;
    }
  }, []);
  if (!state || state.completed >= state.total) return null;
  return (
    <section className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/[.045] p-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-primary">
          Sua jornada
        </p>
        <h2 className="mt-1 text-sm font-semibold">
          Continue o Guia do iniciante
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {state.completed} verificações concluídas · {state.visited} módulos
          visitados
        </p>
      </div>
      <Link href="/guia">
        <Button variant="outline" className="rounded-xl">
          Continuar de onde parei <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </section>
  );
}

function MarketList({
  title,
  icon,
  data,
  negative,
  volume,
}: {
  title: string;
  icon: React.ReactNode;
  data: RouterOutputs["market"]["assets"];
  negative?: boolean;
  volume?: boolean;
}) {
  return (
    <div className="border-b border-border/60 p-4 last:border-0 md:border-b-0 md:border-r md:last:border-r-0">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold">
        {icon}
        {title}
      </div>
      <div className="space-y-1">
        {data.map(asset => (
          <Link
            key={asset.id}
            href={`/asset/${encodeURIComponent(asset.ticker)}`}
            className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 transition hover:bg-accent"
          >
            <span className="text-xs font-semibold">{asset.ticker}</span>
            <div className="flex items-center gap-2">
              {!volume && (
                <span className="text-[11px] font-medium tabular-nums text-foreground">
                  {formatMarketValue(
                    asset.price,
                    asset.assetType,
                    asset.currency
                  )}
                </span>
              )}
              <span
                className={
                  volume
                    ? "text-[11px] text-muted-foreground"
                    : `text-[11px] font-medium tabular-nums ${negative ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`
                }
              >
                {volume
                  ? formatCompact(asset.volume)
                  : `${optionalNumberValue(asset.changePercent) !== null && numberValue(asset.changePercent) >= 0 ? "+" : ""}${formatPercent(asset.changePercent)}`}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
function InsightRow({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">
        {number}
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function EditorialWidget({
  widget,
  index,
  total,
  onMove,
  news,
  calendar,
  watchlist,
  signedIn,
}: {
  widget: string;
  index: number;
  total: number;
  onMove: (widget: string, direction: -1 | 1) => void;
  news: RouterOutputs["market"]["news"];
  calendar: RouterOutputs["market"]["calendar"];
  // Already unwrapped to the underlying assets by the caller (see
  // `watchlistQuery.data?.map(item => item.asset)` in Home()). Each `asset`
  // is the canonical AssetSnapshot (portfolio.watchlist normalizes it
  // server-side), matching market.assets' shape exactly.
  watchlist: RouterOutputs["market"]["assets"];
  signedIn: boolean;
}) {
  const controls = (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Mover cartão para a esquerda"
        disabled={index === 0}
        onClick={() => onMove(widget, -1)}
        className="rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronUp className="h-3.5 w-3.5 -rotate-90" />
      </button>
      <button
        type="button"
        aria-label="Mover cartão para a direita"
        disabled={index === total - 1}
        onClick={() => onMove(widget, 1)}
        className="rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
      </button>
    </div>
  );

  if (widget === "news") {
    const featured = news.slice(0, 2);
    return (
      <Panel className="flex min-h-[236px] flex-col p-5">
        <WidgetHeading
          icon={<Newspaper className="h-4 w-4" />}
          title="Para ler com contexto"
          controls={controls}
        />
        <div className="mt-4 space-y-3">
          {featured.length ? (
            featured.map(item => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl p-2 transition hover:bg-accent"
              >
                <p className="line-clamp-2 text-sm font-semibold leading-5">
                  {item.title}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {item.sourceName} · {formatRelativeDate(item.publishedAt)}
                </p>
              </a>
            ))
          ) : (
            <EmptyWidget text="Nenhuma leitura disponível neste momento." />
          )}
        </div>
        <Link
          href="/news"
          className="mt-auto pt-4 text-xs font-semibold text-primary"
        >
          Ver notícias e documentos oficiais{" "}
          <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
        </Link>
      </Panel>
    );
  }

  if (widget === "calendar") {
    const upcoming = calendar.slice(0, 2);
    return (
      <Panel className="flex min-h-[236px] flex-col p-5">
        <WidgetHeading
          icon={<CalendarDays className="h-4 w-4" />}
          title="Agenda para acompanhar"
          controls={controls}
        />
        <div className="mt-4 space-y-3">
          {upcoming.length ? (
            upcoming.map(item => (
              <div key={item.id} className="rounded-xl px-2 py-2">
                <p className="line-clamp-1 text-sm font-semibold">
                  {item.title}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {item.country} · {formatDate(item.eventDate)} ·{" "}
                  {item.importance === "HIGH"
                    ? "alta importância"
                    : "importância moderada"}
                </p>
              </div>
            ))
          ) : (
            <EmptyWidget text="A agenda econômica será atualizada em breve." />
          )}
        </div>
        <Link
          href="/news"
          className="mt-auto pt-4 text-xs font-semibold text-primary"
        >
          Abrir agenda econômica{" "}
          <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
        </Link>
      </Panel>
    );
  }

  return (
    <Panel className="flex min-h-[236px] flex-col p-5">
      <WidgetHeading
        icon={<Star className="h-4 w-4" />}
        title={signedIn ? "Ativos em observação" : "Comece sua observação"}
        controls={controls}
      />
      <div className="mt-4 space-y-1">
        {watchlist.slice(0, 3).map(asset => (
          <Link
            key={asset.id}
            href={`/asset/${encodeURIComponent(asset.ticker)}`}
            className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 transition hover:bg-accent"
          >
            <span>
              <span className="block text-sm font-semibold">
                {asset.ticker}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {asset.name}
              </span>
            </span>
            <span
              className={`text-xs font-semibold ${changeClass(asset.changePercent)}`}
            >
              {numberValue(asset.changePercent) >= 0 ? "+" : ""}
              {formatPercent(asset.changePercent)}
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-auto pt-4">
        <Link
          href={signedIn ? "/portfolio" : "/markets"}
          className="text-xs font-semibold text-primary"
        >
          {signedIn ? "Ver minha carteira" : "Explorar ativos brasileiros"}{" "}
          <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
        </Link>
      </div>
    </Panel>
  );
}

function WidgetHeading({
  icon,
  title,
  controls,
}: {
  icon: React.ReactNode;
  title: string;
  controls: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </div>
      {controls}
    </div>
  );
}

function EmptyWidget({ text }: { text: string }) {
  return (
    <p className="px-2 py-2 text-xs leading-5 text-muted-foreground">{text}</p>
  );
}
