import {
  CheckCircle2,
  Database,
  Download,
  Info,
  LockKeyhole,
  Mail,
  Radio,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  AppTopBar,
  EmptyState,
  PageHeader,
  Panel,
} from "@/components/apex/ApexPrimitives";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { downloadJson } from "@/lib/exporters";
import AuthAccessOptions from "@/components/AuthAccessOptions";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { openCookiePreferences } from "@/components/CookieConsent";

export default function Trust() {
  const { user, logout } = useAuth();
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const dataSources = trpc.market.dataSources.useQuery();
  const quality = trpc.market.dataQuality.useQuery();
  const preferences = trpc.portfolio.preferences.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const exportQuery = trpc.portfolio.exportData.useQuery(undefined, {
    enabled: false,
  });
  const savePreferences = trpc.portfolio.savePreferences.useMutation({
    onSuccess: () => {
      void preferences.refetch();
      toast.success("Preferência atualizada.");
    },
    onError: error =>
      toast.error(error.message || "Não foi possível salvar a preferência."),
  });
  const deleteAccount = trpc.portfolio.deleteAccount.useMutation({
    onSuccess: async () => {
      await logout();
      toast.success("Sua conta e seus dados foram excluídos.");
      window.location.href = "/";
    },
    onError: error =>
      toast.error(error.message || "Não foi possível excluir a conta."),
  });

  const exportData = async () => {
    const result = await exportQuery.refetch();
    if (result.data) {
      downloadJson(
        `virtus-meus-dados-${new Date().toISOString().slice(0, 10)}.json`,
        result.data
      );
      toast.success("Arquivo dos seus dados gerado.");
    } else if (result.error) {
      toast.error("Não foi possível exportar seus dados.");
    }
  };

  return (
    <DashboardLayout allowAnonymous>
      <AppTopBar title="Confiança & dados" />
      <div className="container pb-12">
        <PageHeader
          eyebrow="Transparência"
          title="Clareza em cada decisão."
          description="Veja como o Virtus trata dados de mercado e controle as informações armazenadas na sua conta."
          actions={
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Sem recomendações automatizadas
            </span>
          }
        />
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <TrustMetric
            icon={<Radio className="h-4 w-4" />}
            label="Estado de mercado"
            value={
              quality.data?.status === "available"
                ? "Fonte ativa"
                : quality.isLoading
                  ? "Verificando"
                  : "Indisponível"
            }
            note={quality.data?.source ?? "Sem cotação de teste disponível"}
          />
          <TrustMetric
            icon={<LockKeyhole className="h-4 w-4" />}
            label="Dados da conta"
            value="Privados"
            note="Carteira e alertas exigem autenticação"
          />
          <TrustMetric
            icon={<Database className="h-4 w-4" />}
            label="Portabilidade"
            value="Disponível"
            note="Exporte seus dados quando quiser"
          />
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
          <Panel className="overflow-hidden">
            <div className="border-b border-border/60 px-5 py-4">
              <h2 className="section-heading">Fontes e disponibilidade</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Credenciais e disponibilidade são avaliadas no servidor; uma
                fonte ativa não equivale a cobertura total para todos os ativos.
              </p>
            </div>
            <div className="divide-y divide-border/60">
              {(dataSources.data ?? []).map(source => {
                const configured = source.configured ?? true;
                const active =
                  source.implementation === "active" &&
                  configured &&
                  source.publicDisplayApproved;
                const status =
                  source.implementation === "planned"
                    ? "Integração planejada"
                    : !source.publicDisplayApproved
                      ? "Licença pública pendente"
                      : !configured
                        ? "Não configurada"
                        : "Ativa";
                return (
                  <div
                    key={source.id}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div>
                      <p className="text-sm font-semibold">{source.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {source.scope}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}
                    >
                      {active ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <Info className="h-3.5 w-3.5" />
                      )}
                      {status}
                    </span>
                  </div>
                );
              })}
            </div>
          </Panel>
          <Panel className="p-5">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="mt-3 section-heading">Comunicações</h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Alertas por e-mail só são enviados quando você os mantém
              habilitados.
            </p>
            {user ? (
              <Button
                type="button"
                variant="outline"
                className="mt-5 w-full rounded-xl"
                disabled={savePreferences.isPending}
                onClick={() =>
                  savePreferences.mutate({
                    emailAlerts: preferences.data?.emailAlerts === 0,
                  })
                }
              >
                {preferences.data?.emailAlerts === 0
                  ? "Ativar alertas por e-mail"
                  : "Desativar alertas por e-mail"}
              </Button>
            ) : (
              <div className="mt-5">
                <AuthAccessOptions />
              </div>
            )}
          </Panel>
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
          <Panel className="p-5">
            <Download className="h-5 w-5 text-primary" />
            <h2 className="mt-3 section-heading">
              Seus dados, no seu controle
            </h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Baixe uma cópia estruturada de carteira manual, favoritos,
              alertas, notificações e preferências. A exportação não inclui
              credenciais nem chaves de provedores.
            </p>
            {user ? (
              <Button
                type="button"
                className="mt-5 w-full rounded-xl"
                disabled={exportQuery.isFetching}
                onClick={() => void exportData()}
              >
                <Download className="mr-2 h-4 w-4" />
                {exportQuery.isFetching
                  ? "Preparando arquivo..."
                  : "Exportar meus dados"}
              </Button>
            ) : (
              <div className="mt-5">
                <EmptyState
                  title="Sua conta, seus dados"
                  description="Entre para solicitar sua exportação."
                  action={<AuthAccessOptions />}
                />
              </div>
            )}
          </Panel>
          <Panel className="p-5">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="mt-3 section-heading">Princípios do Virtus</h2>
            <ul className="mt-3 space-y-3 text-xs leading-5 text-muted-foreground">
              <li>
                • A carteira é cadastrada manualmente; não há conexão com
                corretoras.
              </li>
              <li>
                • Fontes oficiais têm precedência para fatos regulatórios e
                econômicos; provedores operacionais atendem cotações.
              </li>
              <li>
                • Dados demonstrativos são identificados quando nenhuma fonte
                autorizada responde.
              </li>
              <li>
                • O conteúdo é informativo e não constitui recomendação de
                investimento.
              </li>
              <li>
                • E-mails de alerta respeitam a sua preferência de comunicação.
              </li>
            </ul>
          </Panel>
        </div>
        <Panel className="mt-6 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="section-heading">Preferências de privacidade</h2>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">
                Revise a qualquer momento se deseja permitir métricas opcionais.
                A recusa não afeta as funções essenciais do portal.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="shrink-0 rounded-xl"
              onClick={openCookiePreferences}
            >
              Gerenciar métricas
            </Button>
          </div>
        </Panel>
        {user && (
          <Panel className="mt-6 border-rose-500/25 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                  <Trash2 className="h-4 w-4" />
                  <h2 className="section-heading">Excluir conta e dados</h2>
                </div>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">
                  Remove permanentemente carteira, operações, favoritos,
                  alertas, notificações, preferências e identidade de acesso.
                  Antes de continuar, exporte uma cópia dos seus dados.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 rounded-xl border-rose-500/30 text-rose-700 hover:bg-rose-500/10 hover:text-rose-800 dark:text-rose-300"
                    disabled={user.role === "admin"}
                  >
                    Excluir minha conta
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Esta ação é permanente</AlertDialogTitle>
                    <AlertDialogDescription>
                      Para confirmar, digite EXCLUIR MINHA CONTA. Não será
                      possível recuperar os dados após a conclusão.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Input
                    value={deleteConfirmation}
                    onChange={event =>
                      setDeleteConfirmation(event.target.value.toUpperCase())
                    }
                    aria-label="Confirmação para excluir a conta"
                    placeholder="EXCLUIR MINHA CONTA"
                    autoComplete="off"
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      onClick={() => setDeleteConfirmation("")}
                    >
                      Manter minha conta
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-rose-700 text-white hover:bg-rose-800"
                      disabled={
                        deleteConfirmation !== "EXCLUIR MINHA CONTA" ||
                        deleteAccount.isPending
                      }
                      onClick={event => {
                        event.preventDefault();
                        deleteAccount.mutate({
                          confirmation: "EXCLUIR MINHA CONTA",
                        });
                      }}
                    >
                      {deleteAccount.isPending
                        ? "Excluindo..."
                        : "Excluir permanentemente"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            {user.role === "admin" && (
              <p className="mt-3 text-xs text-muted-foreground">
                A conta administradora exige transferência de responsabilidade
                antes de poder ser excluída.
              </p>
            )}
          </Panel>
        )}
      </div>
    </DashboardLayout>
  );
}

function TrustMetric({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="metric-card">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>
    </div>
  );
}
