import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  ArrowUpRight,
  Filter,
  Search,
  Star,
  StarOff,
  Wifi,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  AppTopBar,
  LiveBadge,
  PageHeader,
  Panel,
} from "@/components/apex/ApexPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  formatCompact,
  formatPercent,
  formatPrice,
  numberValue,
  optionalNumberValue,
} from "@/lib/formatters";
import { useMarketRealtime } from "@/hooks/useMarketRealtime";
import { useLocalWatchlist } from "@/hooks/useLocalWatchlist";
import { DataProvenance } from "@/components/DataProvenance";

const types = [
  "Todos",
  "Ação",
  "FII",
  "ETF",
  "Cripto",
  "Índice",
  "Commodity",
  "Forex",
];

const tabs = ["Ativos", "Renda Fixa & Tesouro"];

const assetTypeLabel: Record<string, string> = {
  STOCK: "Ação",
  REIT: "FII",
  ETF: "ETF",
  CRYPTO: "Cripto",
  INDEX: "Índice",
  COMMODITY: "Commodity",
  FOREX: "Forex",
};

export default function Markets() {
  const { user } = useAuth();
  const [tab, setTab] = useState("Ativos");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("Todos");
  const assetsQuery = trpc.market.assets.useQuery(
    {
      search: search || undefined,
      assetType: type === "Todos" ? undefined : type,
    },
    { refetchInterval: 30000, enabled: tab === "Ativos" }
  );
  const treasuryQuery = trpc.market.treasury.useQuery(undefined, {
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
    enabled: tab === "Renda Fixa & Tesouro",
  });
  const watchlistQuery = trpc.portfolio.watchlist.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const addMutation = trpc.portfolio.addToWatchlist.useMutation({
    onSuccess: () => watchlistQuery.refetch(),
  });
  const removeMutation = trpc.portfolio.removeFromWatchlist.useMutation({
    onSuccess: () => watchlistQuery.refetch(),
  });
  const localWatchlist = useLocalWatchlist();
  const syncStarted = useRef(false);
  const assets = assetsQuery.data ?? [];
  const tickers = useMemo(
    () => assets.slice(0, 20).map(asset => asset.ticker),
    [assets]
  );
  const { quotes, connected } = useMarketRealtime(tickers);
  const visibleAssets = assets.filter(
    asset => asset.price !== null || quotes[asset.ticker]?.price !== undefined
  );
  const serverWatchIds = useMemo(
    () => new Set((watchlistQuery.data ?? []).map(item => item.asset.id)),
    [watchlistQuery.data]
  );
  const localWatchIds = useMemo(
    () => new Set(localWatchlist.ids),
    [localWatchlist.ids]
  );
  const watchIds = useMemo(
    () => new Set(Array.from(serverWatchIds).concat(Array.from(localWatchIds))),
    [localWatchIds, serverWatchIds]
  );

  useEffect(() => {
    if (
      !user ||
      !watchlistQuery.data ||
      syncStarted.current ||
      !localWatchlist.ids.length
    )
      return;
    syncStarted.current = true;
    const pending = localWatchlist.ids.filter(
      assetId => !serverWatchIds.has(assetId)
    );
    if (!pending.length) {
      localWatchlist.clear();
      return;
    }
    Promise.all(pending.map(assetId => addMutation.mutateAsync({ assetId })))
      .then(() => {
        localWatchlist.clear();
        void watchlistQuery.refetch();
      })
      .catch(() => {
        syncStarted.current = false;
      });
  }, [addMutation, localWatchlist, serverWatchIds, user, watchlistQuery]);

  return (
    <DashboardLayout allowAnonymous>
      <AppTopBar title="Mercados" />
      <div className="container pb-12">
        <PageHeader
          eyebrow="Universo monitorado"
          title="Mercados sem ruído."
          description="Explore classes de ativos, compare movimentos intradiários e marque os nomes que você quer acompanhar de perto."
          actions={
            connected ? (
              <LiveBadge label="WebSocket conectado" />
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
                <Wifi className="h-3 w-3" />
                Atualização periódica
              </span>
            )
          }
        />
        <Panel className="mb-5 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 overflow-x-auto">
              {tabs.map(item => (
                <button
                  key={item}
                  onClick={() => setTab(item)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
                    tab === item
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/70 text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            {tab === "Ativos" && (
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative max-w-md flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Buscar ativo por ticker ou nome"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Buscar por ticker ou nome"
                    className="h-11 rounded-xl border-border/70 bg-background/60 pl-10"
                  />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto">
                  <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {types.map(item => (
                    <button
                      key={item}
                      onClick={() => setType(item)}
                      className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition ${type === item ? "bg-primary text-primary-foreground" : "bg-muted/70 text-muted-foreground hover:bg-accent"}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Panel>
        {tab === "Ativos" ? (
          <>
            <Panel className="overflow-hidden">
              <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] gap-4 border-b border-border/60 bg-muted/20 px-5 py-3 text-[10px] font-semibold uppercase tracking-[.13em] text-muted-foreground md:grid">
                <span>Ativo</span>
                <span>Último</span>
                <span>Variação</span>
                <span>Volume</span>
                <span>Classe</span>
                <span />
              </div>
              <div className="divide-y divide-border/60">
                {visibleAssets.map(asset => {
                  const live = quotes[asset.ticker];
                  const price = live?.price ?? asset.price;
                  const change = live?.changePercent ?? asset.changePercent;
                  const numericChange = optionalNumberValue(change);
                  const isFav = watchIds.has(asset.id);
                  return (
                    <div
                      key={asset.id}
                      className="grid gap-3 px-4 py-4 transition hover:bg-accent/45 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] md:items-center md:gap-4 md:px-5"
                    >
                      <Link
                        href={`/asset/${encodeURIComponent(asset.ticker)}`}
                        className="min-w-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                            {asset.ticker.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold tracking-tight hover:text-primary">
                              {asset.ticker}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {asset.name}
                            </p>
                          </div>
                        </div>
                      </Link>
                      <div>
                        <p className="text-sm font-semibold">
                          {formatPrice(price, asset.currency)}
                        </p>
                        <DataProvenance
                          source={live?.source ?? asset.source}
                          asOf={live?.asOf ?? asset.fetchedAt}
                          freshness={live ? "delayed" : asset.freshness}
                          compact
                        />
                      </div>
                      <p
                        className={`text-sm font-semibold ${numericChange === null ? "text-muted-foreground" : numericChange >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}
                      >
                        {numericChange !== null && numericChange >= 0 ? "+" : ""}
                        {formatPercent(change)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCompact(live?.volume ?? asset.volume)}
                      </p>
                      <span className="w-fit rounded-full bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">
                        {assetTypeLabel[asset.assetType] ?? asset.assetType}
                      </span>
                      <button
                        aria-label={`${isFav ? "Remover" : "Adicionar"} ${asset.ticker} da watchlist`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-amber-500"
                        onClick={() => {
                          if (!user) return localWatchlist.toggle(asset.id);
                          if (serverWatchIds.has(asset.id))
                            return removeMutation.mutate({ assetId: asset.id });
                          if (localWatchIds.has(asset.id))
                            return localWatchlist.toggle(asset.id);
                          addMutation.mutate({ assetId: asset.id });
                        }}
                      >
                        {isFav ? (
                          <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                        ) : (
                          <StarOff className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  );
                })}
                {!visibleAssets.length && (
                  <div className="p-10 text-center text-sm text-muted-foreground">
                    Nenhum ativo encontrado para este filtro.
                  </div>
                )}
              </div>
            </Panel>
            <div className="mt-5 flex items-center justify-between gap-4 text-xs text-muted-foreground">
              <span>{visibleAssets.length} ativos com cobertura</span>
              <span className="text-right">
                {user ? "Watchlist sincronizada" : "Watchlist deste navegador"}{" "}
                · brapi.dev · CoinGecko · EODHD · Twelve Data · Finnhub
              </span>
            </div>
          </>
        ) : (
          <>
            <Panel className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 px-5 py-4">
                <div>
                  <h2 className="section-heading">Tesouro Direto</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Taxas e preços públicos dos títulos ofertados pelo Tesouro
                    Nacional.
                  </p>
                </div>
                {treasuryQuery.data && (
                  <DataProvenance
                    source={treasuryQuery.data.source}
                    asOf={treasuryQuery.data.updatedAt}
                    freshness="official"
                    compact
                  />
                )}
              </div>
              <div className="hidden grid-cols-[1.75fr_.9fr_1fr_1fr_1fr] gap-4 border-b border-border/60 bg-muted/20 px-5 py-3 text-[10px] font-semibold uppercase tracking-[.13em] text-muted-foreground md:grid">
                <span>Título</span>
                <span>Vencimento</span>
                <span>Taxa anual</span>
                <span>PU</span>
                <span>Investimento mín.</span>
              </div>
              <div className="divide-y divide-border/60">
                {treasuryQuery.data?.bonds.map(bond => (
                  <div
                    key={`${bond.category}-${bond.maturityDate}`}
                    className="grid gap-2 px-4 py-4 md:grid-cols-[1.75fr_.9fr_1fr_1fr_1fr] md:items-center md:gap-4 md:px-5"
                  >
                    <div>
                      <p className="text-sm font-semibold">{bond.name}</p>
                      <span className="w-fit rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {bond.category}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {bond.maturityDate}
                    </p>
                    <p className="text-sm font-semibold">{bond.annualRate}</p>
                    <p className="text-sm tabular-nums">
                      {formatPrice(bond.unitPrice, "BRL")}
                    </p>
                    <p className="text-sm tabular-nums text-muted-foreground">
                      {formatPrice(bond.minInvestment, "BRL")}
                    </p>
                  </div>
                ))}
                {!treasuryQuery.data?.bonds.length &&
                  !treasuryQuery.isLoading && (
                    <div className="p-10 text-center text-sm text-muted-foreground">
                      Nenhum título disponível no momento. Tente novamente em
                      instantes.
                    </div>
                  )}
                {treasuryQuery.isLoading && (
                  <div className="p-10 text-center text-sm text-muted-foreground">
                    Carregando dados do Tesouro Nacional...
                  </div>
                )}
              </div>
            </Panel>
            <div className="mt-5 flex items-center justify-between gap-4 text-xs text-muted-foreground">
              <span>
                {treasuryQuery.data?.bonds.length ?? 0} títulos listados
              </span>
              <span className="text-right">
                Fonte: Tesouro Transparente · dados para consulta informativa
              </span>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
