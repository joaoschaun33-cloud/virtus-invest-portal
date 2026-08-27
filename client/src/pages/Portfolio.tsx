import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BriefcaseBusiness,
  Donut,
  Download,
  FileText,
  FileUp,
  Plus,
  Trash2,
  WalletCards,
  AlertTriangle,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  AppTopBar,
  EmptyState,
  PageHeader,
  Panel,
} from "@/components/apex/ApexPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  formatDate,
  formatPercent,
  formatPrice,
  numberValue,
  optionalNumberValue,
} from "@/lib/formatters";
import { downloadCsv, printReport } from "@/lib/exporters";
import PortfolioInsight from "@/components/PortfolioInsight";
import PortfolioIncome from "@/components/PortfolioIncome";
import AuthAccessOptions from "@/components/AuthAccessOptions";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  downloadPortfolioTemplate,
  parsePortfolioFile,
  type PortfolioImportPreview,
} from "@/lib/portfolioImport";

export default function Portfolio() {
  const { user } = useAuth();
  const summaryQuery = trpc.portfolio.summary.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const transactionsQuery = trpc.portfolio.transactions.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const addMutation = trpc.portfolio.addTransaction.useMutation({
    onSuccess: () => {
      void summaryQuery.refetch();
      void transactionsQuery.refetch();
      toast.success("Operação salva na sua carteira.");
    },
    onError: error =>
      toast.error(error.message || "Não foi possível salvar a operação."),
  });
  const deleteMutation = trpc.portfolio.deleteTransaction.useMutation({
    onSuccess: () => {
      void summaryQuery.refetch();
      void transactionsQuery.refetch();
      toast.success("Operação excluída.");
    },
    onError: error =>
      toast.error(error.message || "Não foi possível excluir a operação."),
  });
  const importMutation = trpc.portfolio.importTransactions.useMutation({
    onSuccess: result => {
      void summaryQuery.refetch();
      void transactionsQuery.refetch();
      setImportOpen(false);
      setImportPreview(null);
      const details = [
        result.duplicates
          ? `${result.duplicates} duplicada(s) ignorada(s)`
          : "",
        result.rejected.length ? `${result.rejected.length} rejeitada(s)` : "",
      ].filter(Boolean);
      toast.success(
        `${result.imported} operação(ões) importada(s)${details.length ? `. ${details.join("; ")}.` : "."}`
      );
    },
    onError: error =>
      toast.error(error.message || "Não foi possível importar a carteira."),
  });
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] =
    useState<PortfolioImportPreview | null>(null);
  const [importFileName, setImportFileName] = useState("");
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [ticker, setTicker] = useState("PETR4");
  const [type, setType] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState("100");
  const [price, setPrice] = useState("36.20");
  const [fees, setFees] = useState("0");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const positions = summaryQuery.data ?? [];
  const totalInvested = positions.reduce(
    (total, position) => total + numberValue(position.invested),
    0
  );
  const positionsWithoutPrice = positions.filter(
    position => optionalNumberValue(position.currentValue) === null
  );
  const pricedValue = positions.reduce(
    (total, position) => total + numberValue(position.currentValue),
    0
  );
  const hasCompleteValuation = positionsWithoutPrice.length === 0;
  const totalValue = hasCompleteValuation ? pricedValue : null;
  const totalProfit = totalValue === null ? null : totalValue - totalInvested;
  const returnPercent =
    totalProfit === null
      ? null
      : totalInvested
        ? (totalProfit / totalInvested) * 100
        : 0;
  const allocation = useMemo(() => {
    const byType = new Map<string, number>();
    positions.forEach(position => {
      const currentValue = optionalNumberValue(position.currentValue);
      if (currentValue === null) return;
      byType.set(
        position.asset.assetType,
        (byType.get(position.asset.assetType) ?? 0) + currentValue
      );
    });
    return Array.from(byType.entries()).sort((a, b) => b[1] - a[1]);
  }, [positions]);
  const allocationTotal = allocation.reduce(
    (total, [, value]) => total + value,
    0
  );
  const colors = ["#2563eb", "#10b981", "#f59e0b", "#a855f7", "#ef4444"];
  const donut = allocation.reduce((gradient, [, value], index) => {
    const start =
      (allocation
        .slice(0, index)
        .reduce((total, [, itemValue]) => total + itemValue, 0) /
        Math.max(allocationTotal, 1)) *
      100;
    const end = start + (value / Math.max(allocationTotal, 1)) * 100;
    return `${gradient}${index ? ", " : ""}${colors[index % colors.length]} ${start}% ${end}%`;
  }, "");

  const submit = () => {
    if (!ticker.trim()) {
      toast.error("Informe o ticker do ativo.");
      return;
    }
    if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
      toast.error("Informe uma quantidade maior que zero.");
      return;
    }
    if (!Number.isFinite(Number(price)) || Number(price) <= 0) {
      toast.error("Informe um preço unitário maior que zero.");
      return;
    }
    if (!date) {
      toast.error("Informe a data da operação.");
      return;
    }
    addMutation.mutate({
      ticker: ticker.toUpperCase(),
      transactionType: type,
      quantity: Number(quantity),
      unitPrice: Number(price),
      fees: Number(fees) || 0,
      transactionDate: date,
    });
  };
  const exportPortfolioCsv = () => {
    const downloaded = downloadCsv(
      `virtus-carteira-${new Date().toISOString().slice(0, 10)}.csv`,
      positions.map(position => ({
        ticker: position.asset.ticker,
        ativo: position.asset.name,
        classe: position.asset.assetType,
        quantidade: position.quantity,
        valorAtual: optionalNumberValue(position.currentValue),
        investido: numberValue(position.invested),
        rentabilidade: optionalNumberValue(position.returnPercent),
      }))
    );
    if (downloaded) toast.success("CSV da carteira gerado.");
    else toast.error("Adicione uma posição antes de exportar.");
  };
  const exportTransactionsCsv = () =>
    downloadCsv(
      `virtus-lancamentos-${new Date().toISOString().slice(0, 10)}.csv`,
      (transactionsQuery.data ?? []).map(row => ({
        ticker: row.asset.ticker,
        tipo: row.transaction.transactionType === "BUY" ? "Compra" : "Venda",
        quantidade: row.transaction.quantity,
        precoUnitario: row.transaction.unitPrice,
        taxas: row.transaction.fees,
        data: row.transaction.transactionDate,
      }))
    );
  const exportPdf = () => {
    const opened = printReport(
      "Relatório da carteira Virtus",
      `Gerado em ${new Date().toLocaleString("pt-BR")} · Entrada manual · dados informativos`,
      [
        {
          heading: "Resumo",
          columns: ["Métrica", "Valor"],
          rows: [
            ["Valor atual", formatPrice(totalValue)],
            ["Total investido", formatPrice(totalInvested)],
            ["Resultado absoluto", formatPrice(totalProfit)],
            ["Rentabilidade", formatPercent(returnPercent)],
          ],
        },
        {
          heading: "Posições",
          columns: [
            "Ativo",
            "Classe",
            "Quantidade",
            "Valor atual",
            "Rentabilidade",
          ],
          rows: positions.map(position => [
            position.asset.ticker,
            position.asset.assetType,
            position.quantity,
            formatPrice(position.currentValue),
            formatPercent(position.returnPercent),
          ]),
        },
        {
          heading: "Lançamentos",
          columns: ["Ativo", "Tipo", "Quantidade", "Preço", "Data"],
          rows: (transactionsQuery.data ?? []).map(row => [
            row.asset.ticker,
            row.transaction.transactionType === "BUY" ? "Compra" : "Venda",
            row.transaction.quantity,
            formatPrice(row.transaction.unitPrice),
            formatDate(row.transaction.transactionDate, {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
          ]),
        },
      ]
    );
    if (!opened)
      toast.error(
        "O navegador bloqueou a janela de impressão. Permita pop-ups e tente novamente."
      );
  };

  const requestDelete = (id: number) => {
    if (!window.confirm("Excluir esta operação da carteira?")) return;
    deleteMutation.mutate({ id });
  };

  const selectImportFile = async (file?: File) => {
    if (!file) return;
    setIsReadingFile(true);
    try {
      const preview = await parsePortfolioFile(file);
      setImportPreview(preview);
      setImportFileName(file.name);
    } catch (error) {
      setImportPreview(null);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível ler o arquivo."
      );
    } finally {
      setIsReadingFile(false);
    }
  };

  return (
    <DashboardLayout allowAnonymous>
      <AppTopBar title="Carteira" />
      <div className="container pb-12">
        <PageHeader
          eyebrow="Acompanhamento manual"
          title="Sua carteira, do seu jeito."
          description="Registre compras e vendas manualmente para acompanhar custo, saldo e rentabilidade simples, sem qualquer conexão com corretora ou Open Finance."
          actions={
            user ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  className="rounded-xl"
                  onClick={() => setImportOpen(true)}
                >
                  <FileUp className="mr-2 h-3.5 w-3.5" />
                  Importar carteira
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={exportPortfolioCsv}
                  disabled={!positions.length}
                >
                  <Download className="mr-2 h-3.5 w-3.5" />
                  CSV da carteira
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={exportPdf}
                  disabled={!positions.length}
                >
                  <FileText className="mr-2 h-3.5 w-3.5" />
                  Imprimir / PDF
                </Button>
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary">
                  <WalletCards className="h-3 w-3" />
                  Modo: entrada manual
                </span>
              </div>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary">
                <WalletCards className="h-3 w-3" />
                Entre para montar sua carteira
              </span>
            )
          }
        />
        <div className="mb-6 rounded-2xl border border-border/60 bg-muted/25 px-4 py-3 text-xs leading-5 text-muted-foreground">
          <strong className="text-foreground">Leitura transparente.</strong> Os
          lançamentos são processados em ordem cronológica. A rentabilidade usa
          o último preço disponível e não inclui impostos, proventos ou eventos
          corporativos.
        </div>
        {user && positionsWithoutPrice.length > 0 && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[.07] p-4 text-xs leading-5 text-amber-900 dark:text-amber-200"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              A avaliação consolidada está indisponível porque{" "}
              {positionsWithoutPrice.map(item => item.asset.ticker).join(", ")}{" "}
              {positionsWithoutPrice.length === 1 ? "não possui" : "não possuem"}{" "}
              preço atual. O custo registrado permanece preservado e nenhuma
              perda foi presumida.
            </p>
          </div>
        )}
        {!user ? (
          <Panel className="mb-6 p-8">
            <EmptyState
              title="Entre para salvar sua carteira"
              description="Faça login para cadastrar suas operações e salvar sua carteira e seus alertas com segurança."
              action={<AuthAccessOptions />}
            />
          </Panel>
        ) : (
          <>
            <PortfolioInsight />
            <PortfolioIncome />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="metric-card">
                <p className="text-xs text-muted-foreground">Valor atual</p>
                <p className="mt-3 text-2xl font-semibold tracking-[-.04em]">
                  {formatPrice(totalValue)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  posição consolidada
                </p>
              </div>
              <div className="metric-card">
                <p className="text-xs text-muted-foreground">Total investido</p>
                <p className="mt-3 text-2xl font-semibold tracking-[-.04em]">
                  {formatPrice(totalInvested)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  custo líquido estimado
                </p>
              </div>
              <div className="metric-card">
                <p className="text-xs text-muted-foreground">
                  Resultado absoluto
                </p>
                <p
                  className={`mt-3 text-2xl font-semibold tracking-[-.04em] ${totalProfit === null ? "text-muted-foreground" : totalProfit >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}
                >
                  {totalProfit !== null && totalProfit >= 0 ? "+" : ""}
                  {formatPrice(totalProfit)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  marcação pelo último preço
                </p>
              </div>
              <div className="metric-card">
                <p className="text-xs text-muted-foreground">Rentabilidade</p>
                <p
                  className={`mt-3 text-2xl font-semibold tracking-[-.04em] ${returnPercent === null ? "text-muted-foreground" : returnPercent >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}
                >
                  {returnPercent !== null && returnPercent >= 0 ? "+" : ""}
                  {formatPercent(returnPercent)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  sem considerar impostos
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
              <Panel className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                  <div>
                    <h2 className="section-heading">Posições atuais</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Saldo líquido por ativo.
                    </p>
                  </div>
                  <BriefcaseBusiness className="h-5 w-5 text-primary" />
                </div>
                <div className="divide-y divide-border/60">
                  {positions.map(position => (
                    <div
                      key={position.asset.id}
                      className="grid gap-3 px-5 py-4 sm:grid-cols-[1.3fr_1fr_1fr_1fr] sm:items-center"
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          {position.asset.ticker}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {position.quantity.toLocaleString("pt-BR")} unidades ·{" "}
                          {position.asset.assetType}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Valor atual
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {formatPrice(position.currentValue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Preço médio
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {formatPrice(
                            numberValue(position.invested) /
                              Math.max(position.quantity, 1)
                          )}
                        </p>
                      </div>
                      <div
                        className={`text-sm font-semibold ${optionalNumberValue(position.returnPercent) === null ? "text-muted-foreground" : numberValue(position.returnPercent) >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}
                      >
                        {optionalNumberValue(position.returnPercent) !== null &&
                        numberValue(position.returnPercent) >= 0
                          ? "+"
                          : ""}
                        {formatPercent(position.returnPercent)}
                      </div>
                    </div>
                  ))}
                  {!positions.length && (
                    <div className="p-10 text-center text-sm text-muted-foreground">
                      Ainda não há posições. Registre sua primeira operação ao
                      lado.
                    </div>
                  )}
                </div>
              </Panel>
              <Panel id="portfolio-operation-form" className="scroll-mt-20 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="section-heading">Alocação</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Por classe de ativo.
                    </p>
                  </div>
                  <Donut className="h-5 w-5 text-primary" />
                </div>
                <div
                  className="mx-auto mt-6 flex h-44 w-44 items-center justify-center rounded-full"
                  style={{
                    background: donut
                      ? `conic-gradient(${donut})`
                      : "var(--muted)",
                  }}
                >
                  <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-card text-center">
                    <span className="text-[10px] text-muted-foreground">
                      total
                    </span>
                    <span className="mt-1 text-sm font-semibold">
                      {formatPrice(totalValue)}
                    </span>
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  {allocation.map(([label, value], index) => (
                    <div
                      key={label}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="flex items-center gap-2">
                        <i
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: colors[index % colors.length],
                          }}
                        />
                        {label}
                      </span>
                      <span className="font-semibold">
                        {formatPercent(
                          (value / Math.max(allocationTotal, 1)) * 100,
                          1
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-[.78fr_1.22fr]">
              <Panel className="p-5">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  <h2 className="section-heading">Lançar operação</h2>
                </div>
                <div className="mt-5 space-y-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-pressed={type === "BUY"}
                      onClick={() => setType("BUY")}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold ${type === "BUY" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "border-border text-muted-foreground"}`}
                    >
                      <ArrowDownToLine className="h-3.5 w-3.5" />
                      Compra
                    </button>
                    <button
                      type="button"
                      aria-pressed={type === "SELL"}
                      onClick={() => setType("SELL")}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold ${type === "SELL" ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300" : "border-border text-muted-foreground"}`}
                    >
                      <ArrowUpFromLine className="h-3.5 w-3.5" />
                      Venda
                    </button>
                  </div>
                  <div>
                    <Label htmlFor="portfolio-ticker" className="text-xs">
                      Ticker
                    </Label>
                    <Input
                      id="portfolio-ticker"
                      value={ticker}
                      onChange={event =>
                        setTicker(event.target.value.toUpperCase())
                      }
                      className="mt-2 h-10 rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="portfolio-quantity" className="text-xs">
                        Quantidade
                      </Label>
                      <Input
                        id="portfolio-quantity"
                        inputMode="decimal"
                        value={quantity}
                        onChange={event => setQuantity(event.target.value)}
                        className="mt-2 h-10 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label htmlFor="portfolio-price" className="text-xs">
                        Preço unitário
                      </Label>
                      <Input
                        id="portfolio-price"
                        inputMode="decimal"
                        value={price}
                        onChange={event =>
                          setPrice(event.target.value.replace(",", "."))
                        }
                        className="mt-2 h-10 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="portfolio-fees" className="text-xs">
                        Corretagem / taxas
                      </Label>
                      <Input
                        id="portfolio-fees"
                        inputMode="decimal"
                        value={fees}
                        onChange={event =>
                          setFees(event.target.value.replace(",", "."))
                        }
                        className="mt-2 h-10 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label htmlFor="portfolio-date" className="text-xs">
                        Data
                      </Label>
                      <Input
                        id="portfolio-date"
                        type="date"
                        value={date}
                        onChange={event => setDate(event.target.value)}
                        className="mt-2 h-10 rounded-xl"
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full rounded-xl"
                    onClick={submit}
                    disabled={addMutation.isPending}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {addMutation.isPending ? "Salvando..." : "Salvar operação"}
                  </Button>
                  {addMutation.error && (
                    <p className="text-xs text-rose-600">
                      {addMutation.error.message}
                    </p>
                  )}
                </div>
              </Panel>
              <Panel className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
                  <div>
                    <h2 className="section-heading">
                      Histórico de lançamentos
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Compras e vendas registradas manualmente.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 rounded-lg text-xs"
                    onClick={exportTransactionsCsv}
                    disabled={!(transactionsQuery.data ?? []).length}
                  >
                    <Download className="mr-2 h-3.5 w-3.5" />
                    CSV
                  </Button>
                </div>
                <div className="divide-y divide-border/60">
                  {(transactionsQuery.data ?? []).map(row => (
                    <div
                      key={row.transaction.id}
                      className="flex items-center justify-between gap-3 px-5 py-4"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${row.transaction.transactionType === "BUY" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}
                        >
                          {row.transaction.transactionType === "BUY" ? (
                            <ArrowDownToLine className="h-4 w-4" />
                          ) : (
                            <ArrowUpFromLine className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">
                            {row.asset.ticker} ·{" "}
                            {row.transaction.transactionType === "BUY"
                              ? "Compra"
                              : "Venda"}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {row.transaction.quantity} un. a{" "}
                            {formatPrice(row.transaction.unitPrice)} ·{" "}
                            {formatDate(row.transaction.transactionDate, {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label="Excluir operação"
                        onClick={() => requestDelete(row.transaction.id)}
                        disabled={deleteMutation.isPending}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {!transactionsQuery.data?.length && (
                    <div className="p-10 text-center text-sm text-muted-foreground">
                      Nenhuma operação registrada.
                    </div>
                  )}
                </div>
              </Panel>
            </div>
          </>
        )}
      </div>
      <Dialog
        open={importOpen}
        onOpenChange={open => {
          setImportOpen(open);
          if (!open && !importMutation.isPending) {
            setImportPreview(null);
            setImportFileName("");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Importar carteira</DialogTitle>
            <DialogDescription>
              Envie operações em CSV, XLSX ou XLS. Confira a prévia antes de
              salvar; duplicidades serão ignoradas automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-dashed border-border p-5 text-center">
              <FileUp className="mx-auto h-7 w-7 text-primary" />
              <p className="mt-2 text-sm font-semibold">
                {importFileName || "Selecione a planilha da carteira"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Até 500 operações por arquivo.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button asChild variant="outline" className="rounded-xl">
                  <label>
                    {isReadingFile ? "Lendo arquivo..." : "Escolher arquivo"}
                    <input
                      type="file"
                      className="sr-only"
                      accept=".csv,.xlsx,.xls"
                      disabled={isReadingFile}
                      onChange={event => {
                        void selectImportFile(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </label>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-xl"
                  onClick={() => void downloadPortfolioTemplate()}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Baixar modelo Virtus
                </Button>
              </div>
            </div>
            {importPreview && (
              <>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-emerald-700 dark:text-emerald-300">
                    {importPreview.rows.length} válida(s)
                  </span>
                  <span className="rounded-full bg-rose-500/10 px-3 py-1.5 text-rose-700 dark:text-rose-300">
                    {importPreview.errors.length} com erro
                  </span>
                </div>
                {importPreview.rows.length > 0 && (
                  <div className="max-h-64 overflow-auto rounded-xl border border-border">
                    <table className="w-full min-w-[640px] text-left text-xs">
                      <thead className="sticky top-0 bg-muted">
                        <tr>
                          <th className="p-3">Linha</th>
                          <th className="p-3">Ativo</th>
                          <th className="p-3">Tipo</th>
                          <th className="p-3">Quantidade</th>
                          <th className="p-3">Preço</th>
                          <th className="p-3">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {importPreview.rows.slice(0, 100).map(row => (
                          <tr key={row.line}>
                            <td className="p-3">{row.line}</td>
                            <td className="p-3 font-semibold">{row.ticker}</td>
                            <td className="p-3">
                              {row.transactionType === "BUY"
                                ? "Compra"
                                : "Venda"}
                            </td>
                            <td className="p-3">{row.quantity}</td>
                            <td className="p-3">
                              {formatPrice(row.unitPrice)}
                            </td>
                            <td className="p-3">{row.transactionDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {importPreview.errors.length > 0 && (
                  <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-4">
                    <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                      Corrija estas linhas no arquivo
                    </p>
                    <ul className="mt-2 max-h-28 space-y-1 overflow-auto text-xs text-muted-foreground">
                      {importPreview.errors.map(error => (
                        <li key={`${error.line}-${error.reason}`}>
                          Linha {error.line}: {error.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportOpen(false)}
              disabled={importMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!importPreview?.rows.length || importMutation.isPending}
              onClick={() =>
                importPreview &&
                importMutation.mutate({ rows: importPreview.rows })
              }
            >
              {importMutation.isPending
                ? "Importando..."
                : `Importar ${importPreview?.rows.length ?? 0} operação(ões)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
