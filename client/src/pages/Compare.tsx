import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Plus, Scale, X } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { AppTopBar, PageHeader, Panel } from "@/components/apex/ApexPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { formatPercent, formatPrice, numberValue, optionalNumberValue } from "@/lib/formatters";
import { DataProvenance } from "@/components/DataProvenance";
import { toast } from "sonner";

export default function Compare() {
  const initial = useMemo(() => {
    if (typeof window === "undefined") return ["PETR4", "VALE3"];
    const values =
      new URLSearchParams(window.location.search)
        .get("tickers")
        ?.split(",")
        .filter(Boolean)
        .map(item => item.toUpperCase()) ?? [];
    return values.length ? values.slice(0, 4) : ["PETR4", "VALE3"];
  }, []);
  const [tickers, setTickers] = useState(initial);
  const [input, setInput] = useState("");
  const assetsQuery = trpc.market.assets.useQuery(undefined, {
    staleTime: 30_000,
  });
  const query = trpc.market.compare.useQuery(
    { tickers },
    { enabled: tickers.length > 0 }
  );
  const snapshots = query.data ?? [];
  const add = () => {
    const value = input.trim().toUpperCase();
    if (!value) return toast.error("Informe um ticker.");
    if (tickers.includes(value))
      return toast.error(`${value} já está no comparador.`);
    if (tickers.length >= 4) return toast.error("O limite é de quatro ativos.");
    if (
      assetsQuery.data &&
      !assetsQuery.data.some(asset => asset.ticker === value)
    )
      return toast.error("Ticker não encontrado no catálogo.");
    setTickers([...tickers, value]);
    setInput("");
  };
  const remove = (ticker: string) =>
    setTickers(tickers.filter(item => item !== ticker));
  const allChanges = snapshots.map(snapshot =>
    numberValue(snapshot?.quote.changePercent)
  );
  const maxChange = Math.max(...allChanges.map(value => Math.abs(value)), 1);

  return (
    <DashboardLayout allowAnonymous>
      <AppTopBar title="Comparar" />
      <div className="container pb-12">
        <PageHeader
          eyebrow="Análise lado a lado"
          title="Compare até quatro ativos."
          description="Uma mesma lente para preço, movimento, fundamentos e estrutura. O comparador organiza o contexto; a decisão continua sendo sua."
          actions={
            <Link href="/markets">
              <Button variant="outline" className="rounded-xl">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Mercados
              </Button>
            </Link>
          }
        />
        <Panel className="mb-6 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {tickers.map(ticker => (
              <span
                key={ticker}
                className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-xs font-semibold text-primary"
              >
                {ticker}
                <button
                  aria-label={`Remover ${ticker}`}
                  onClick={() => remove(ticker)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            {tickers.length < 4 && (
              <div className="flex min-w-[220px] flex-1 items-center gap-2">
                <Input
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  onKeyDown={event => event.key === "Enter" && add()}
                  placeholder="Adicionar ticker"
                  className="h-9 rounded-xl border-dashed bg-background/50"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-xl"
                  onClick={add}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Adicionar
                </Button>
              </div>
            )}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {tickers.length}/4 ativos selecionados · pressione Enter para
            adicionar.
          </p>
          {query.isError && (
            <p className="mt-2 text-xs text-rose-600">
              Não foi possível atualizar a comparação.
            </p>
          )}
        </Panel>
        <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
          <Panel className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border/60 px-5 py-4">
              <Scale className="h-4 w-4 text-primary" />
              <div>
                <h2 className="section-heading">Movimento relativo</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Variação diária normalizada entre os ativos.
                </p>
              </div>
            </div>
            <div className="space-y-5 p-5">
              {query.isLoading && (
                <div className="space-y-4 animate-pulse">
                  {tickers.map(ticker => (
                    <div key={ticker} className="space-y-2">
                      <div className="flex justify-between">
                        <div className="h-4 w-16 rounded bg-muted/60" />
                        <div className="h-4 w-12 rounded bg-muted/60" />
                      </div>
                      <div className="h-3 rounded-full bg-muted/40" />
                      <div className="h-3 w-32 rounded bg-muted/30" />
                    </div>
                  ))}
                </div>
              )}
              {snapshots.map(snapshot => {
                if (!snapshot) return null;
                const asset = snapshot.asset;
                const change = optionalNumberValue(snapshot.quote.changePercent);
                const ratio = Math.min(
                  100,
                  ((change === null ? 0 : Math.abs(change)) / maxChange) * 100
                );
                return (
                  <div key={asset.ticker}>
                    <div className="mb-2 flex items-center justify-between">
                      <Link
                        href={`/asset/${encodeURIComponent(asset.ticker)}`}
                        className="text-sm font-semibold hover:text-primary"
                      >
                        {asset.ticker}
                      </Link>
                      <span
                        className={`text-sm font-semibold ${change === null ? "text-muted-foreground" : change >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}
                      >
                        {change !== null && change >= 0 ? "+" : ""}
                        {formatPercent(change)}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${change === null ? "bg-muted" : change >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                      <span>{asset.name}</span>
                      <span>
                        {formatPrice(snapshot.quote.price, asset.currency)}
                      </span>
                    </div>
                    <div className="mt-2">
                      <DataProvenance
                        source={snapshot.quote.source}
                        asOf={snapshot.quote.asOf}
                        freshness={snapshot.quote.freshness}
                        compact
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
          <Panel className="overflow-hidden">
            <div className="border-b border-border/60 px-5 py-4">
              <h2 className="section-heading">Fundamentos</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Indicadores públicos, lado a lado.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left">
                <thead>
                  <tr className="border-b border-border/60 text-[10px] uppercase tracking-[.13em] text-muted-foreground">
                    <th className="px-5 py-3 font-semibold">Indicador</th>
                    {snapshots.map(snapshot => (
                      <th
                        key={snapshot?.asset.ticker}
                        className="px-3 py-3 font-semibold"
                      >
                        {snapshot?.asset.ticker}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["P/L", "peRatio", ""],
                    ["P/VP", "pbRatio", ""],
                    ["DY", "dividendYield", "%"],
                    ["ROE", "roe", "%"],
                    ["Margem líquida", "netMargin", "%"],
                  ].map(([label, key, suffix]) => (
                    <tr
                      key={label}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="px-5 py-3 text-xs font-medium text-muted-foreground">
                        {label}
                      </td>
                      {snapshots.map(snapshot => {
                        const value =
                          snapshot?.asset[key as keyof typeof snapshot.asset];
                        return (
                          <td
                            key={`${label}-${snapshot?.asset.ticker}`}
                            className="px-3 py-3 text-sm font-semibold"
                          >
                            {value === null || value === undefined
                              ? "—"
                              : `${numberValue(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}${suffix}`}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
        <p className="mt-5 text-center text-[11px] leading-5 text-muted-foreground">
          Comparações são ferramentas de análise informativa. Não constituem
          recomendação, rating ou indicação de compra e venda.
        </p>
      </div>
    </DashboardLayout>
  );
}
