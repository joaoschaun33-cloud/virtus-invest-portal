import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import {
  ArrowLeft,
  Bell,
  BarChart3,
  Calendar,
  Check,
  RefreshCw,
  Scale,
  Star,
  StarOff,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  AppTopBar,
  LiveBadge,
  PageHeader,
  Panel,
} from "@/components/apex/ApexPrimitives";
import { MarketChart } from "@/components/apex/MarketChart";
import { FinancialHistoryChart } from "@/components/apex/FinancialHistoryChart";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  formatCompact,
  formatDate,
  formatMarketValue,
  formatPercent,
  formatPrice,
  numberValue,
  optionalNumberValue,
} from "@/lib/formatters";
import { useLocalWatchlist } from "@/hooks/useLocalWatchlist";
import { DataProvenance } from "@/components/DataProvenance";
import { toast } from "sonner";
import { trackProductEvent } from "@/lib/analytics";

const periods = ["1D", "1W", "1M", "3M", "1Y", "MAX"];

export default function AssetDetail() {
  const [, params] = useRoute("/asset/:ticker");
  const ticker = decodeURIComponent(params?.ticker ?? "PETR4").toUpperCase();
  const { user } = useAuth();
  const [interval, setInterval] = useState("1D");
  const [mode, setMode] = useState<"line" | "candle">("candle");
  const input = useMemo(() => ({ ticker, interval }), [ticker, interval]);
  const snapshotQuery = trpc.market.asset.useQuery(input, {
    refetchInterval: 30000,
  });
  const issuerQuery = trpc.market.issuer.useQuery(
    { ticker },
    { staleTime: 24 * 60 * 60 * 1000 }
  );
  const statementsQuery = trpc.market.financialStatements.useQuery(
    { ticker },
    { staleTime: 12 * 60 * 60 * 1000, retry: 1 }
  );
  const watchlistQuery = trpc.portfolio.watchlist.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const addMutation = trpc.portfolio.addToWatchlist.useMutation({
    onSuccess: () => watchlistQuery.refetch(),
  });
  const removeMutation = trpc.portfolio.removeFromWatchlist.useMutation({
    onSuccess: () => watchlistQuery.refetch(),
  });
  const refreshMutation = trpc.market.refreshQuote.useMutation({
    onSuccess: result => {
      void snapshotQuery.refetch();
      if (result.ok) toast.success("Cotação atualizada.");
      else
        toast.info("Fonte ao vivo indisponível; mantido o dado de referência.");
    },
    onError: error =>
      toast.error(error.message || "Não foi possível atualizar a cotação."),
  });
  const localWatchlist = useLocalWatchlist();
  const snapshot = snapshotQuery.data;
  const asset = snapshot?.asset;
  const trackedTicker = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!snapshot || trackedTicker.current === snapshot.asset.ticker) return;
    trackedTicker.current = snapshot.asset.ticker;
    trackProductEvent("asset_detail_loaded", { ticker: snapshot.asset.ticker, asset_type: snapshot.asset.assetType, source: snapshot.quote.source });
  }, [snapshot]);
  const isServerFavorite = Boolean(
    asset && watchlistQuery.data?.some(item => item.asset.id === asset.id)
  );
  const isLocalFavorite = Boolean(
    asset && localWatchlist.ids.includes(asset.id)
  );
  const isFavorite = isServerFavorite || isLocalFavorite;
  const lastPrice = snapshot?.quote.price ?? null;
  const lastChange = optionalNumberValue(
    snapshot?.quote.changePercent ?? asset?.changePercent
  );
  const snapshotSource = snapshot?.dataSource ?? "catalog";
  const fundamentalsSource = snapshot?.fundamentalsSource ?? "catalog";
  const advancedAsset = asset as typeof asset & Record<string, unknown>;

  if (snapshotQuery.isError)
    return (
      <DashboardLayout allowAnonymous>
        <AppTopBar title="Ativo" />
        <div className="container py-16">
          <Panel className="p-10 text-center">
            <p className="text-lg font-semibold">
              Não foi possível carregar este ativo
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              A fonte de dados pode estar temporariamente indisponível. Tente
              novamente ou volte para os mercados.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Button
                className="rounded-xl"
                onClick={() => snapshotQuery.refetch()}
              >
                Tentar novamente
              </Button>
              <Link href="/markets">
                <Button variant="outline" className="rounded-xl">
                  Voltar aos mercados
                </Button>
              </Link>
            </div>
          </Panel>
        </div>
      </DashboardLayout>
    );
  if (snapshotQuery.isLoading)
    return (
      <DashboardLayout allowAnonymous>
        <AppTopBar title={`${ticker} · carregando`} />
        <div className="container pb-12 animate-pulse space-y-6">
          <div className="mt-4 h-4 w-32 rounded bg-muted/60" />
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-muted/40" />
            <div className="h-9 w-64 rounded-xl bg-muted/60" />
            <div className="h-4 w-96 max-w-full rounded bg-muted/30" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-2xl border border-border/60 bg-card/40 p-4"
              />
            ))}
          </div>
          <div className="h-80 rounded-2xl border border-border/60 bg-card/40" />
        </div>
      </DashboardLayout>
    );

  if (!asset)
    return (
      <DashboardLayout allowAnonymous>
        <AppTopBar title="Ativo" />
        <div className="container py-16">
          <Panel className="p-10 text-center">
            <p className="text-lg font-semibold">Ativo não encontrado</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Confira o ticker ou volte para a lista de mercados.
            </p>
            <Link href="/markets">
              <Button className="mt-5 rounded-xl">Voltar aos mercados</Button>
            </Link>
          </Panel>
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout allowAnonymous>
      <AppTopBar title={`${ticker} · detalhe`} />
      <div className="container pb-12">
        <div className="mb-5">
          <Link
            href="/markets"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar aos mercados
          </Link>
        </div>
        <PageHeader
          eyebrow={`${asset?.assetType ?? "Ativo"} · ${asset?.exchange ?? "mercado"}`}
          title={asset?.name ?? ticker}
          description={`${ticker} · leitura informativa de preço, volume, indicadores técnicos e fundamentos públicos.`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <LiveBadge label="Atualização preparada" />
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => refreshMutation.mutate({ ticker })}
                disabled={refreshMutation.isPending}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${refreshMutation.isPending ? "animate-spin" : ""}`}
                />
                Atualizar
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  if (!asset) return;
                  if (!user) return localWatchlist.toggle(asset.id);
                  if (isServerFavorite)
                    return removeMutation.mutate({ assetId: asset.id });
                  if (isLocalFavorite) return localWatchlist.toggle(asset.id);
                  addMutation.mutate({ assetId: asset.id });
                }}
              >
                {isFavorite ? (
                  <Star className="mr-2 h-4 w-4 fill-amber-500 text-amber-500" />
                ) : (
                  <StarOff className="mr-2 h-4 w-4" />
                )}
                {isFavorite ? "Favoritado" : "Favoritar"}
              </Button>
            </div>
          }
        />
        {snapshot?.quote && (
          <div className="mb-5 rounded-2xl border border-border/60 bg-muted/35 px-4 py-3">
            <DataProvenance
              source={snapshot.quote.source}
              asOf={snapshot.quote.asOf}
              freshness={snapshot.quote.freshness}
            />
          </div>
        )}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(330px,.7fr)]">
          <Panel className="overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-border/60 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-semibold tracking-[-.05em]">
                    {formatMarketValue(
                      lastPrice,
                      asset?.assetType ?? "STOCK",
                      asset?.currency ?? "BRL"
                    )}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${lastChange === null ? "bg-muted text-muted-foreground" : lastChange >= 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-rose-500/10 text-rose-600 dark:text-rose-300"}`}
                  >
                    {lastChange !== null && lastChange >= 0 ? "+" : ""}
                    {formatPercent(lastChange)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Cotação canônica; o gráfico abaixo é uma série histórica
                  separada.
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1">
                {periods.map(period => (
                  <button
                    key={period}
                    onClick={() => setInterval(period)}
                    className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${interval === period ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-4 pb-3 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1">
                  {(["line", "candle"] as const).map(item => (
                    <button
                      key={item}
                      onClick={() => setMode(item)}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${mode === item ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                    >
                      {item === "line" ? "Linha" : "Candlestick"}
                    </button>
                  ))}
                </div>
                <div className="hidden items-center gap-3 text-[11px] text-muted-foreground sm:flex">
                  <span>MM20</span>
                  <span>MM200</span>
                  <span>RSI</span>
                  <span>Volume</span>
                </div>
              </div>
              {snapshot?.quotes?.length ? (
                <MarketChart data={snapshot.quotes} mode={mode} />
              ) : (
                <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                  Histórico oficial indisponível para este período.
                </div>
              )}
            </div>
          </Panel>
          <div className="space-y-6">
            <Panel className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[.15em] text-primary">
                    Fundamentos públicos
                  </p>
                  <h2 className="mt-2 section-heading">Leitura rápida</h2>
                </div>
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  ["P/L", asset?.peRatio],
                  ["P/VP", asset?.pbRatio],
                  ["DY", asset?.dividendYield, "%"],
                  ["ROE", asset?.roe, "%"],
                  ["Margem líquida", asset?.netMargin, "%"],
                  ["Volume", formatCompact(snapshot?.quote.volume)],
                  ["EBITDA", advancedAsset?.ebitda],
                  ["Dívida líquida", advancedAsset?.netDebt],
                  ["Crescimento do lucro", advancedAsset?.earningsGrowth, "%"],
                  ["Crescimento da receita", advancedAsset?.revenueGrowth, "%"],
                ].map(([label, value, suffix]) => (
                  <div
                    key={String(label)}
                    className="rounded-xl bg-background/55 p-3"
                  >
                    <p className="text-[11px] text-muted-foreground">
                      {String(label)}
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {value === null || value === undefined
                        ? "—"
                        : `${numberValue(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}${suffix ?? ""}`}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[10px] leading-4 text-muted-foreground">
                Indicadores de mercado são informativos e não constituem
                recomendação. Consulte abaixo os valores contábeis oficiais da
                companhia, quando disponíveis.
              </p>
            </Panel>
            <Panel className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[.15em] text-primary">
                    Demonstrações oficiais
                  </p>
                  <h2 className="mt-2 section-heading">
                    Números reportados à CVM
                  </h2>
                </div>
                <Scale className="h-5 w-5 text-primary" />
              </div>
              {statementsQuery.isLoading ? (
                <p className="mt-5 text-xs text-muted-foreground">
                  Consultando o arquivo regulatório mais recente…
                </p>
              ) : statementsQuery.data ? (
                <>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {[
                      [
                        "Receita acumulada",
                        statementsQuery.data.values.revenue,
                      ],
                      ["Lucro líquido", statementsQuery.data.values.netIncome],
                      ["Ativo total", statementsQuery.data.values.totalAssets],
                      [
                        "Patrimônio líquido",
                        statementsQuery.data.values.equity,
                      ],
                    ].map(([label, value]) => (
                      <div
                        key={String(label)}
                        className="rounded-xl bg-background/55 p-3"
                      >
                        <p className="text-[11px] text-muted-foreground">
                          {String(label)}
                        </p>
                        <p className="mt-2 text-sm font-semibold">
                          {value === null ? "—" : formatPrice(value, "BRL")}
                        </p>
                      </div>
                    ))}
                  </div>
                  {statementsQuery.data.derivedMetrics.length > 0 && (
                    <div className="mt-5 border-t border-border/60 pt-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-foreground">
                            Indicadores calculados
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            Cálculo Virtus sobre os valores oficiais acima
                          </p>
                        </div>
                        <span className="rounded-full border border-border/70 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                          Fonte derivada
                        </span>
                      </div>
                      <div className="mt-4 space-y-2">
                        {statementsQuery.data.derivedMetrics.map(metric => (
                          <details
                            key={metric.id}
                            className="group rounded-xl border border-border/60 bg-background/45 p-3"
                          >
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                              <span className="text-[11px] font-medium text-muted-foreground">
                                {metric.label}
                              </span>
                              <span className="text-sm font-semibold text-foreground">
                                {formatPercent(metric.value)}
                              </span>
                            </summary>
                            <div className="mt-3 border-t border-border/50 pt-3 text-[10px] leading-4 text-muted-foreground">
                              <p>{metric.interpretation}</p>
                              <p className="mt-1">
                                <span className="font-semibold text-foreground">
                                  Fórmula:
                                </span>{" "}
                                {metric.formula}.
                              </p>
                              {metric.limitation && (
                                <p className="mt-1 text-amber-700 dark:text-amber-300">
                                  {metric.limitation}
                                </p>
                              )}
                            </div>
                          </details>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="mt-4 text-[10px] leading-4 text-muted-foreground">
                    {statementsQuery.data.filing} consolidado · referência{" "}
                    {formatDate(statementsQuery.data.referenceDate, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    · receita e resultado acumulados desde{" "}
                    {formatDate(statementsQuery.data.periodStart, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                    . Valores convertidos da escala declarada para reais.
                  </p>
                  <a
                    href={statementsQuery.data.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline"
                  >
                    Consultar dados oficiais da CVM
                  </a>
                </>
              ) : (
                <p className="mt-5 text-xs leading-5 text-muted-foreground">
                  Não há demonstração consolidada compatível para este ativo.
                  Nenhum valor estimado foi usado como substituto.
                </p>
              )}
            </Panel>
            <Panel className="p-5">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h2 className="section-heading">Contexto do ativo</h2>
              </div>
              <div className="mt-4 space-y-3 text-xs text-muted-foreground">
                <p className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  Fonte do histórico:{" "}
                  {snapshotSource === "catalog"
                    ? "indisponível"
                    : snapshotSource}
                  .
                </p>
                <p className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  Setor: {asset?.sector ?? "não classificado"}.
                </p>
                <p className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  Fundamentos:{" "}
                  {fundamentalsSource === "catalog"
                    ? "indisponíveis"
                    : fundamentalsSource}{" "}
                  · moeda: {asset?.currency ?? "BRL"}.
                </p>
                {typeof advancedAsset?.fundamentalsAsOf !== "undefined" && (
                  <p className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    Referência fundamentalista:{" "}
                    {formatDate(
                      advancedAsset.fundamentalsAsOf as string | number | Date,
                      { day: "2-digit", month: "short", year: "numeric" }
                    )}
                    .
                  </p>
                )}
                {issuerQuery.data?.cvm && (
                  <div className="rounded-xl border border-border/60 bg-background/45 p-3 text-[11px] leading-5">
                    <p className="font-semibold text-foreground">
                      Cadastro oficial CVM
                    </p>
                    <p className="mt-1">
                      {issuerQuery.data.cvm.legalName} · CNPJ{" "}
                      {issuerQuery.data.cvm.cnpj}
                    </p>
                    <p>
                      Emissor B3 {issuerQuery.data.b3.issuerCode} · Código CVM{" "}
                      {issuerQuery.data.cvm.cvmCode}
                    </p>
                    <p>
                      Situação{" "}
                      {issuerQuery.data.cvm.registrationStatus.toLocaleLowerCase(
                        "pt-BR"
                      )}
                    </p>
                    <a
                      href={issuerQuery.data.cvm.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex font-semibold text-primary hover:underline"
                    >
                      Consultar fonte oficial
                    </a>
                  </div>
                )}
              </div>
              <Link
                href={`/compare?tickers=${encodeURIComponent(ticker)}`}
                className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-border/70 px-3 py-2.5 text-xs font-semibold transition hover:bg-accent"
              >
                <Scale className="h-3.5 w-3.5" />
                Comparar este ativo
              </Link>
            </Panel>
          </div>
        </div>
        {statementsQuery.data &&
          statementsQuery.data.quarterlyHistory.length >= 2 && (
            <Panel className="mt-6 overflow-hidden">
              <div className="border-b border-border/60 px-5 py-5">
                <p className="text-[11px] font-semibold uppercase tracking-[.15em] text-primary">
                  Evolução financeira
                </p>
                <h2 className="mt-2 section-heading">
                  Receita, lucro e margem por trimestre
                </h2>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Períodos trimestrais e comparativos explicitamente publicados
                  pela companhia no arquivo {statementsQuery.data.filing}{" "}
                  consolidado da CVM.
                </p>
              </div>
              <div className="p-4 sm:p-5">
                <FinancialHistoryChart
                  data={statementsQuery.data.quarterlyHistory}
                />
                <p className="mt-3 text-[10px] leading-4 text-muted-foreground">
                  Barras em reais; a linha representa a margem líquida calculada
                  pela Virtus. Valores acumulados no ano não são somados nem
                  tratados como trimestre.
                </p>
              </div>
            </Panel>
          )}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="metric-card">
            <p className="text-xs text-muted-foreground">Abertura</p>
            <p className="mt-2 text-xl font-semibold">
              {formatPrice(snapshot?.quote.open, asset?.currency ?? "BRL")}
            </p>
          </div>
          <div className="metric-card">
            <p className="text-xs text-muted-foreground">Máxima da cotação</p>
            <p className="mt-2 text-xl font-semibold">
              {formatPrice(snapshot?.quote.high, asset?.currency ?? "BRL")}
            </p>
          </div>
          <div className="metric-card">
            <p className="text-xs text-muted-foreground">Volume negociado</p>
            <p className="mt-2 text-xl font-semibold">
              {formatCompact(snapshot?.quote.volume)}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
