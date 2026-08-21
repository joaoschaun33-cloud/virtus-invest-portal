import { useState } from "react";
import {
  Bell,
  BellRing,
  CheckCircle2,
  Mail,
  PauseCircle,
  Plus,
  Trash2,
  Zap,
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
import { formatPrice, formatRelativeDate } from "@/lib/formatters";
import AuthAccessOptions from "@/components/AuthAccessOptions";
import { toast } from "sonner";

export default function Alerts() {
  const { user } = useAuth();
  const alertsQuery = trpc.portfolio.alerts.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const notificationsQuery = trpc.portfolio.notifications.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const createMutation = trpc.portfolio.createAlert.useMutation({
    onSuccess: result => {
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      void alertsQuery.refetch();
      toast.success("Alerta criado.");
    },
    onError: error =>
      toast.error(error.message || "Não foi possível criar o alerta."),
  });
  const toggleMutation = trpc.portfolio.toggleAlert.useMutation({
    onSuccess: () => {
      void alertsQuery.refetch();
      toast.success("Estado do alerta atualizado.");
    },
    onError: error =>
      toast.error(error.message || "Não foi possível atualizar o alerta."),
  });
  const deleteMutation = trpc.portfolio.deleteAlert.useMutation({
    onSuccess: () => {
      void alertsQuery.refetch();
      toast.success("Alerta excluído.");
    },
    onError: error =>
      toast.error(error.message || "Não foi possível excluir o alerta."),
  });
  const markReadMutation = trpc.portfolio.markNotificationRead.useMutation({
    onSuccess: () => notificationsQuery.refetch(),
    onError: error =>
      toast.error(error.message || "Não foi possível atualizar a notificação."),
  });
  const preferenceQuery = trpc.portfolio.preferences.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const providerStatus = trpc.market.providerStatus.useQuery();
  const emailConfigured = Boolean(providerStatus.data?.resend);
  const preferenceMutation = trpc.portfolio.savePreferences.useMutation({
    onSuccess: () => {
      void preferenceQuery.refetch();
      toast.success("Preferência de e-mail atualizada.");
    },
    onError: error =>
      toast.error(error.message || "Não foi possível salvar a preferência."),
  });
  const [ticker, setTicker] = useState("PETR4");
  const [target, setTarget] = useState("40");
  const [condition, setCondition] = useState<"ABOVE" | "BELOW">("ABOVE");

  const submit = () => {
    if (!ticker.trim()) {
      toast.error("Informe o ativo do alerta.");
      return;
    }
    if (!Number.isFinite(Number(target)) || Number(target) <= 0) {
      toast.error("Informe um preço-alvo maior que zero.");
      return;
    }
    createMutation.mutate({
      ticker: ticker.toUpperCase(),
      targetPrice: Number(target),
      condition,
      emailEnabled: preferenceQuery.data?.emailAlerts !== 0,
    });
  };

  return (
    <DashboardLayout allowAnonymous>
      <AppTopBar title="Alertas" />
      <div className="container pb-12">
        <PageHeader
          eyebrow="Personalização"
          title="Deixe o portal observar por você."
          description="Crie alertas de preço acima ou abaixo de um alvo e receba o aviso dentro do portal. O e-mail segue a preferência de notificação da sua conta."
          actions={
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary">
              <BellRing className="h-3 w-3" />
              In-app + e-mail
            </span>
          }
        />
        {!user ? (
          <Panel className="p-8">
            <EmptyState
              title="Entre para criar alertas"
              description="Os alertas são privados e precisam de uma conta para serem salvos."
              action={<AuthAccessOptions />}
            />
          </Panel>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[.72fr_1.28fr]">
            <Panel className="h-fit p-5">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                <h2 className="section-heading">Novo alerta</h2>
              </div>
              <div className="mt-5 space-y-4">
                <div>
                  <Label className="text-xs">Ativo</Label>
                  <Input
                    value={ticker}
                    onChange={event =>
                      setTicker(event.target.value.toUpperCase())
                    }
                    className="mt-2 h-10 rounded-xl"
                    placeholder="Ex.: PETR4"
                  />
                </div>
                <div>
                  <Label className="text-xs">Disparar quando</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setCondition("ABOVE")}
                      className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${condition === "ABOVE" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "border-border text-muted-foreground"}`}
                    >
                      Acima de
                    </button>
                    <button
                      onClick={() => setCondition("BELOW")}
                      className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${condition === "BELOW" ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300" : "border-border text-muted-foreground"}`}
                    >
                      Abaixo de
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Preço-alvo</Label>
                  <Input
                    inputMode="decimal"
                    value={target}
                    onChange={event =>
                      setTarget(event.target.value.replace(",", "."))
                    }
                    className="mt-2 h-10 rounded-xl"
                    placeholder="0,00"
                  />
                </div>
                <Button
                  className="w-full rounded-xl"
                  onClick={submit}
                  disabled={createMutation.isPending}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  {createMutation.isPending ? "Criando..." : "Criar alerta"}
                </Button>
                {createMutation.data && !createMutation.data.ok && (
                  <p className="text-xs text-rose-600">
                    {createMutation.data.message}
                  </p>
                )}
                <div className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-[11px] leading-5 text-muted-foreground">
                  <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <p>
                    Notificações por e-mail:{" "}
                    <button
                      type="button"
                      className="font-semibold text-primary"
                      disabled={preferenceMutation.isPending}
                      onClick={() =>
                        preferenceMutation.mutate({
                          emailAlerts: preferenceQuery.data?.emailAlerts === 0,
                        })
                      }
                    >
                      {preferenceQuery.data?.emailAlerts === 0
                        ? "desativadas"
                        : "ativas"}
                    </button>
                    .{" "}
                    {emailConfigured
                      ? "E-mail transacional configurado e pronto para disparos."
                      : "O envio efetivo depende da configuração do provedor transacional."}
                  </p>
                </div>
              </div>
            </Panel>
            <div className="space-y-6">
              <Panel className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                  <div>
                    <h2 className="section-heading">Alertas ativos</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Você pode pausar ou reativar a qualquer momento.
                    </p>
                  </div>
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div className="divide-y divide-border/60">
                  {(alertsQuery.data ?? []).map(row => (
                    <div
                      key={row.alert.id}
                      className="flex items-center justify-between gap-3 px-5 py-4"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl ${row.alert.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                        >
                          {row.alert.isActive ? (
                            <BellRing className="h-4 w-4" />
                          ) : (
                            <PauseCircle className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">
                            {row.asset.ticker}{" "}
                            <span className="font-normal text-muted-foreground">
                              ·{" "}
                              {row.alert.condition === "ABOVE"
                                ? "acima de"
                                : "abaixo de"}{" "}
                              {formatPrice(
                                row.alert.targetPrice,
                                row.asset.currency
                              )}
                            </span>
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Criado {formatRelativeDate(row.alert.createdAt)} ·{" "}
                            {row.alert.isActive ? "monitorando" : "pausado"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="rounded-lg px-3 py-2 text-[11px] font-semibold text-primary hover:bg-accent disabled:opacity-50"
                          disabled={
                            toggleMutation.isPending || deleteMutation.isPending
                          }
                          onClick={() =>
                            toggleMutation.mutate({
                              id: row.alert.id,
                              isActive: !Boolean(row.alert.isActive),
                            })
                          }
                        >
                          {row.alert.isActive ? "Pausar" : "Reativar"}
                        </button>
                        <button
                          type="button"
                          aria-label={`Excluir alerta de ${row.asset.ticker}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
                          disabled={
                            toggleMutation.isPending || deleteMutation.isPending
                          }
                          onClick={() => {
                            if (window.confirm("Excluir este alerta?"))
                              deleteMutation.mutate({ id: row.alert.id });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {!alertsQuery.data?.length && (
                    <div className="p-10 text-center text-sm text-muted-foreground">
                      Nenhum alerta cadastrado.
                    </div>
                  )}
                </div>
              </Panel>
              <Panel className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                  <div>
                    <h2 className="section-heading">Central de notificações</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Avisos disparados no produto.
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="divide-y divide-border/60">
                  {(notificationsQuery.data ?? []).map(item => (
                    <button
                      type="button"
                      key={item.id}
                      disabled={
                        Boolean(item.isRead) || markReadMutation.isPending
                      }
                      onClick={() => markReadMutation.mutate({ id: item.id })}
                      className={`flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-accent ${item.isRead ? "opacity-60" : ""}`}
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {item.message}
                        </p>
                        <p className="mt-2 text-[10px] text-muted-foreground">
                          {formatRelativeDate(item.createdAt)}
                        </p>
                      </div>
                    </button>
                  ))}
                  {!notificationsQuery.data?.length && (
                    <div className="p-10 text-center text-sm text-muted-foreground">
                      Seus avisos aparecerão aqui.
                    </div>
                  )}
                </div>
              </Panel>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
