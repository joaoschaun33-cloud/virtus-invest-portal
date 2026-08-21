import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ArrowUpDown,
  Filter,
  HelpCircle,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { AppTopBar, PageHeader, Panel } from "@/components/apex/ApexPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { formatPercent, formatPrice, numberValue } from "@/lib/formatters";

export default function Screener() {
  const [assetType, setAssetType] = useState("Ação");
  const [minDy, setMinDy] = useState("");
  const [minRoe, setMinRoe] = useState("");
  const [maxPe, setMaxPe] = useState("");
  const [maxPb, setMaxPb] = useState("");
  const [minEbitda, setMinEbitda] = useState("");
  const [maxNetDebt, setMaxNetDebt] = useState("");
  const [minEarningsGrowth, setMinEarningsGrowth] = useState("");
  const [minRevenueGrowth, setMinRevenueGrowth] = useState("");
  const [sortBy, setSortBy] = useState<
    | "change"
    | "dividendYield"
    | "roe"
    | "volume"
    | "pe"
    | "ebitda"
    | "earningsGrowth"
    | "revenueGrowth"
  >("change");
  const input = useMemo(
    () => ({
      assetType: assetType || undefined,
      minDividendYield: minDy ? Number(minDy) : undefined,
      minRoe: minRoe ? Number(minRoe) : undefined,
      maxPe: maxPe ? Number(maxPe) : undefined,
      maxPb: maxPb ? Number(maxPb) : undefined,
      minEbitda: minEbitda ? Number(minEbitda) : undefined,
      maxNetDebt: maxNetDebt ? Number(maxNetDebt) : undefined,
      minEarningsGrowth: minEarningsGrowth
        ? Number(minEarningsGrowth)
        : undefined,
      minRevenueGrowth: minRevenueGrowth ? Number(minRevenueGrowth) : undefined,
      sortBy,
    }),
    [
      assetType,
      minDy,
      minRoe,
      maxPe,
      maxPb,
      minEbitda,
      maxNetDebt,
      minEarningsGrowth,
      minRevenueGrowth,
      sortBy,
    ]
  );
  const query = trpc.market.screener.useQuery(input);

  function clear() {
    setAssetType("Ação");
    setMinDy("");
    setMinRoe("");
    setMaxPe("");
    setMaxPb("");
    setMinEbitda("");
    setMaxNetDebt("");
    setMinEarningsGrowth("");
    setMinRevenueGrowth("");
    setSortBy("change");
  }

  return (
    <DashboardLayout allowAnonymous>
      <AppTopBar title="Screener" />
      <div className="container pb-12">
        <PageHeader
          eyebrow="Análise independente"
          title="Encontre padrões, não respostas prontas."
          description="Filtre ativos por indicadores públicos e crie uma shortlist para sua própria diligência. Os critérios são transparentes e editáveis."
          actions={
            <Button variant="outline" className="rounded-xl" onClick={clear}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Limpar filtros
            </Button>
          }
        />
        <div className="grid gap-6 xl:grid-cols-[290px_minmax(0,1fr)]">
          <Panel className="h-fit p-5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <h2 className="section-heading">Filtros</h2>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <Label htmlFor="screener-asset-type" className="text-xs">
                  Classe de ativo
                </Label>
                <select
                  id="screener-asset-type"
                  value={assetType}
                  onChange={event => setAssetType(event.target.value)}
                  className="mt-2 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">Todas</option>
                  <option value="Ação">Ações</option>
                  <option value="FII">FIIs</option>
                  <option value="Cripto">Cripto</option>
                  <option value="ETF">ETFs</option>
                </select>
              </div>
              <FilterInput
                label="DY mínimo (%)"
                help="Dividend yield: proventos distribuídos em relação ao preço. Compare períodos e fontes antes de interpretar."
                value={minDy}
                onChange={setMinDy}
                placeholder="Ex.: 4"
              />
              <FilterInput
                label="ROE mínimo (%)"
                help="Retorno sobre o patrimônio líquido. É uma razão contábil e depende da qualidade e do período dos dados."
                value={minRoe}
                onChange={setMinRoe}
                placeholder="Ex.: 10"
              />
              <FilterInput
                label="P/L máximo"
                help="Preço sobre lucro. Um múltiplo menor não é automaticamente melhor; crescimento, risco e ciclo importam."
                value={maxPe}
                onChange={setMaxPe}
                placeholder="Ex.: 18"
              />
              <FilterInput
                label="P/VP máximo"
                help="Preço sobre valor patrimonial. Compare empresas e setores semelhantes, pois a leitura varia por modelo de negócio."
                value={maxPb}
                onChange={setMaxPb}
                placeholder="Ex.: 2"
              />
              <div className="border-t border-border/60 pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-muted-foreground">
                  Fundamentos avançados
                </p>
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                  Disponíveis apenas quando retornados pelo provedor live;
                  ausência não é zero.
                </p>
              </div>
              <FilterInput
                label="EBITDA mínimo"
                help="Resultado antes de juros, impostos, depreciação e amortização, quando fornecido diretamente pelo provedor."
                value={minEbitda}
                onChange={setMinEbitda}
                placeholder="Ex.: 100000000"
              />
              <FilterInput
                label="Dívida líquida máxima"
                help="Dívida financeira menos caixa, na mesma data de referência. Ausência de dado não significa dívida zero."
                value={maxNetDebt}
                onChange={setMaxNetDebt}
                placeholder="Ex.: 500000000"
              />
              <FilterInput
                label="Crescimento de lucro mínimo (%)"
                help="Variação do lucro no período informado pelo provedor; confira a janela temporal antes de comparar ativos."
                value={minEarningsGrowth}
                onChange={setMinEarningsGrowth}
                placeholder="Ex.: 5"
              />
              <FilterInput
                label="Crescimento de receita mínimo (%)"
                help="Variação da receita no período informado pelo provedor; a métrica não representa projeção futura."
                value={minRevenueGrowth}
                onChange={setMinRevenueGrowth}
                placeholder="Ex.: 5"
              />
              <div>
                <Label htmlFor="screener-sort" className="text-xs">
                  Ordenar por
                </Label>
                <select
                  id="screener-sort"
                  value={sortBy}
                  onChange={event =>
                    setSortBy(event.target.value as typeof sortBy)
                  }
                  className="mt-2 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="change">Variação do dia</option>
                  <option value="dividendYield">Dividend yield</option>
                  <option value="roe">ROE</option>
                  <option value="volume">Volume</option>
                  <option value="pe">Menor P/L</option>
                  <option value="ebitda">Maior EBITDA</option>
                  <option value="earningsGrowth">Crescimento do lucro</option>
                  <option value="revenueGrowth">Crescimento da receita</option>
                </select>
              </div>
            </div>
            <div className="mt-6 rounded-xl bg-primary/[0.07] p-3 text-[11px] leading-5 text-muted-foreground">
              <Filter className="mb-2 h-4 w-4 text-primary" />
              <p>
                O screener não classifica ativos como bons ou ruins. Ele apenas
                reduz o universo de pesquisa por critérios que você escolheu.
              </p>
            </div>
          </Panel>
          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
              <div>
                <h2 className="section-heading">Resultados</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {query.data?.length ?? 0} ativos correspondentes.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ArrowUpDown className="h-3.5 w-3.5" />
                Ordenação dinâmica
              </div>
            </div>
            <div className="hidden grid-cols-[1.4fr_repeat(5,1fr)] gap-4 border-b border-border/60 bg-muted/20 px-5 py-3 text-[10px] font-semibold uppercase tracking-[.13em] text-muted-foreground md:grid">
              <span>Ativo</span>
              <span>P/L</span>
              <span>P/VP</span>
              <span>DY</span>
              <span>ROE</span>
              <span>Margem</span>
            </div>
            <div className="divide-y divide-border/60">
              {(query.data ?? []).map(asset => (
                <Link
                  key={asset.id}
                  href={`/asset/${encodeURIComponent(asset.ticker)}`}
                  className="grid gap-3 px-4 py-4 transition hover:bg-accent/50 md:grid-cols-[1.4fr_repeat(5,1fr)] md:items-center md:gap-4 md:px-5"
                >
                  <div>
                    <p className="text-sm font-semibold">{asset.ticker}</p>
                    <p className="text-xs text-muted-foreground">
                      {asset.name}
                    </p>
                  </div>
                  <MetricValue value={asset.peRatio} />
                  <MetricValue value={asset.pbRatio} />
                  <MetricValue value={asset.dividendYield} suffix="%" good />
                  <MetricValue value={asset.roe} suffix="%" good />
                  <MetricValue value={asset.netMargin} suffix="%" good />
                  <div className="col-span-full flex flex-wrap gap-x-4 gap-y-1 border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                    <span>
                      EBITDA:{" "}
                      <MetricValue
                        value={(asset as Record<string, unknown>).ebitda}
                      />
                    </span>
                    <span>
                      Dívida líquida:{" "}
                      <MetricValue
                        value={(asset as Record<string, unknown>).netDebt}
                      />
                    </span>
                    <span>
                      Lucro:{" "}
                      <MetricValue
                        value={
                          (asset as Record<string, unknown>).earningsGrowth
                        }
                        suffix="%"
                        good
                      />
                    </span>
                    <span>
                      Receita:{" "}
                      <MetricValue
                        value={(asset as Record<string, unknown>).revenueGrowth}
                        suffix="%"
                        good
                      />
                    </span>
                    <span>
                      Fonte:{" "}
                      {String(
                        (asset as Record<string, unknown>).source ?? "catálogo"
                      )}
                    </span>
                  </div>
                </Link>
              ))}
              {!query.data?.length && (
                <div className="p-12 text-center">
                  <p className="text-sm font-semibold">
                    Nenhum resultado com estes filtros
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ajuste os limites e tente novamente.
                  </p>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </DashboardLayout>
  );
}
function FilterInput({
  label,
  value,
  onChange,
  placeholder,
  help,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  help?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1">
        <Label className="text-xs">{label}</Label>
        {help && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`Explicação sobre ${label}`}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <HelpCircle className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-[260px] text-xs leading-5"
            >
              {help}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <Input
        aria-label={label}
        inputMode="decimal"
        value={value}
        onChange={event => onChange(event.target.value.replace(",", "."))}
        placeholder={placeholder}
        className="mt-2 h-10 rounded-xl bg-background/60"
      />
    </div>
  );
}
function MetricValue({
  value,
  suffix,
  good,
}: {
  value: unknown;
  suffix?: string;
  good?: boolean;
}) {
  const numeric = numberValue(value);
  return (
    <span
      className={`text-sm font-semibold ${good && numeric > 0 ? "text-emerald-600 dark:text-emerald-300" : ""}`}
    >
      {value === null || value === undefined
        ? "—"
        : `${numeric.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}${suffix ?? ""}`}
    </span>
  );
}
