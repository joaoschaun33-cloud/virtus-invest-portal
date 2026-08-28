import { useState } from "react";
import { CheckCircle2, Clipboard, ExternalLink, FileCheck2, PauseCircle, PlayCircle, Send, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { AppTopBar, EmptyState, PageHeader, Panel } from "@/components/apex/ApexPrimitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { EditorialVisualCard } from "@/components/editorial/EditorialVisualCard";

const statusLabel = {
  draft: "Com pendências",
  needs_review: "Aguardando revisão",
  approved: "Aprovado",
  rejected: "Rejeitado",
  published: "Publicado",
} as const;
const slotLabel = { morning: "Manhã", intraday: "Intraday", close: "Fechamento", breaking: "Plantão" } as const;

export default function Editorial() {
  const { user } = useAuth();
  const queue = trpc.editorial.list.useQuery({ limit: 50 }, { enabled: user?.role === "admin" });
  const operation = trpc.editorial.operationState.useQuery(undefined, { enabled: user?.role === "admin" });
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [publishId, setPublishId] = useState<string | null>(null);
  const [channel, setChannel] = useState("");
  const [publicationUrl, setPublicationUrl] = useState("");
  const refresh = () => void queue.refetch();
  const setOperation = trpc.editorial.setOperationState.useMutation({
    onSuccess: state => {
      toast.success(state.paused ? "Operação editorial pausada." : "Operação editorial retomada.");
      setPauseDialogOpen(false); setPauseReason(""); void operation.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const approve = trpc.editorial.approve.useMutation({
    onSuccess: () => { toast.success("Rascunho aprovado para publicação manual."); refresh(); },
    onError: error => toast.error(error.message),
  });
  const reject = trpc.editorial.reject.useMutation({
    onSuccess: () => { toast.success("Rascunho devolvido com justificativa."); setRejectId(null); setRejectNote(""); refresh(); },
    onError: error => toast.error(error.message),
  });
  const recordPublication = trpc.editorial.recordPublication.useMutation({
    onSuccess: () => { toast.success("Publicação registrada no histórico."); setPublishId(null); setChannel(""); setPublicationUrl(""); refresh(); },
    onError: error => toast.error(error.message),
  });

  if (user && user.role !== "admin") {
    return <DashboardLayout><AppTopBar title="Operação editorial" /><div className="container pb-12"><EmptyState title="Área restrita" description="A fila editorial está disponível somente para a equipe responsável." /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <AppTopBar title="Operação editorial" />
      <div className="container pb-12">
        <PageHeader eyebrow="Revisão humana obrigatória" title="Fila editorial assistida" description="A automação cria rascunhos com fatos e fontes. Somente uma pessoa diferente do autor pode aprovar; a publicação nas redes continua manual." />
        <Panel className={`mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${operation.data?.paused ? "border-red-500/40 bg-red-500/[.06]" : "border-emerald-500/30 bg-emerald-500/[.04]"}`}>
          <div className="flex items-start gap-3"><ShieldAlert className={`mt-0.5 h-5 w-5 ${operation.data?.paused ? "text-red-600" : "text-emerald-600"}`} /><div><p className="text-sm font-semibold">{operation.data?.paused ? "Distribuição editorial pausada" : "Operação editorial ativa"}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{operation.data?.paused ? `${operation.data.reason}${operation.data.updatedBy ? ` · por ${operation.data.updatedBy}` : ""}` : "Novos rascunhos podem ser gerados e publicações aprovadas podem ser registradas."}</p></div></div>
          {operation.data?.paused ? <Button variant="outline" disabled={setOperation.isPending} onClick={() => setOperation.mutate({ paused: false })}><PlayCircle className="mr-2 h-4 w-4" />Retomar operação</Button> : <Button variant="destructive" disabled={operation.isLoading || setOperation.isPending} onClick={() => setPauseDialogOpen(true)}><PauseCircle className="mr-2 h-4 w-4" />Pausar tudo</Button>}
        </Panel>
        <Panel className="mb-6 border-amber-500/25 bg-amber-500/[.04] p-4 text-sm leading-6">
          Não existe botão de autopublicação. “Aprovar” apenas libera o texto para cópia; depois da postagem manual, registre canal e URL para manter a trilha de auditoria.
        </Panel>
        {queue.isLoading ? <p role="status" className="text-sm text-muted-foreground">Carregando fila editorial…</p> : !(queue.data?.length) ? <EmptyState title="Nenhum rascunho na fila" description="Os jobs de manhã, intraday e fechamento criarão os rascunhos elegíveis." /> : (
          <div className="space-y-5">
            {queue.data.map(draft => (
              <Panel key={draft.id} className="overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-border/60 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-red-700 dark:text-red-300">{slotLabel[draft.slot]}</span><span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">{statusLabel[draft.status]}</span></div><h2 className="mt-3 text-lg font-semibold">{draft.title}</h2><p className="mt-1 text-xs text-muted-foreground">Criado por {draft.createdBy} · {new Date(draft.createdAt).toLocaleString("pt-BR")}</p></div>
                  <Button variant="outline" size="sm" onClick={() => void navigator.clipboard.writeText(`${draft.title}\n\n${draft.body}`).then(() => toast.success("Texto copiado."))}><Clipboard className="mr-2 h-4 w-4" />Copiar</Button>
                </div>
                <div className="grid gap-5 p-5 xl:grid-cols-[1fr_.72fr_.9fr]">
                  <div><p className="whitespace-pre-wrap text-sm leading-6">{draft.body}</p>{draft.issues.length > 0 && <ul className="mt-4 space-y-1 text-xs text-destructive">{draft.issues.map(issue => <li key={issue}>• {issue}</li>)}</ul>}{draft.reviewNote && <p className="mt-4 rounded-xl bg-muted p-3 text-xs"><strong>Nota da revisão:</strong> {draft.reviewNote}</p>}</div>
                  <div className="space-y-3"><h3 className="text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">Evidências</h3><ul className="space-y-2 text-xs">{draft.facts.map(fact => <li key={fact}>• {fact}</li>)}</ul><div className="space-y-2">{draft.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-primary underline underline-offset-4">{source.name}{source.official ? " · oficial" : ""}<ExternalLink className="h-3 w-3" /></a>)}</div></div>
                  <EditorialVisualCard draft={draft} />
                </div>
                {(draft.status === "needs_review" || draft.status === "approved") && <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 p-4">{draft.status === "needs_review" ? <><Button variant="outline" onClick={() => setRejectId(draft.id)}><XCircle className="mr-2 h-4 w-4" />Rejeitar</Button><Button onClick={() => approve.mutate({ id: draft.id })} disabled={approve.isPending}><CheckCircle2 className="mr-2 h-4 w-4" />Aprovar</Button></> : <Button disabled={operation.data?.paused} onClick={() => setPublishId(draft.id)}><Send className="mr-2 h-4 w-4" />Registrar publicação manual</Button>}</div>}
                {draft.status === "published" && <div className="border-t border-border/60 p-4 text-xs text-emerald-700 dark:text-emerald-300"><FileCheck2 className="mr-2 inline h-4 w-4" />Publicado manualmente em {draft.publishedChannel}{draft.publishedAt ? ` · ${new Date(draft.publishedAt).toLocaleString("pt-BR")}` : ""}</div>}
              </Panel>
            ))}
          </div>
        )}
      </div>
      <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}><DialogContent><DialogHeader><DialogTitle>Pausar toda a operação editorial?</DialogTitle><DialogDescription>Novos rascunhos automáticos e o registro de publicações serão bloqueados até a retomada. Rascunhos existentes continuarão preservados.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="pause-reason">Motivo da pausa</Label><Textarea id="pause-reason" placeholder="Ex.: conferência de dado incorreto ou incidente com uma fonte" value={pauseReason} onChange={event => setPauseReason(event.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setPauseDialogOpen(false)}>Cancelar</Button><Button variant="destructive" disabled={pauseReason.trim().length < 3 || setOperation.isPending} onClick={() => setOperation.mutate({ paused: true, reason: pauseReason })}>Pausar operação</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={Boolean(rejectId)} onOpenChange={open => !open && setRejectId(null)}><DialogContent><DialogHeader><DialogTitle>Rejeitar rascunho</DialogTitle><DialogDescription>Registre uma justificativa objetiva para que a correção seja auditável.</DialogDescription></DialogHeader><Label htmlFor="reject-note">Justificativa</Label><Textarea id="reject-note" value={rejectNote} onChange={event => setRejectNote(event.target.value)} /><DialogFooter><Button variant="outline" onClick={() => setRejectId(null)}>Cancelar</Button><Button variant="destructive" disabled={rejectNote.trim().length < 3 || reject.isPending} onClick={() => rejectId && reject.mutate({ id: rejectId, note: rejectNote })}>Confirmar rejeição</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={Boolean(publishId)} onOpenChange={open => !open && setPublishId(null)}><DialogContent><DialogHeader><DialogTitle>Registrar publicação manual</DialogTitle><DialogDescription>Este registro não publica nada. Ele apenas arquiva onde o conteúdo aprovado foi postado.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="publication-channel">Canal</Label><Input id="publication-channel" placeholder="Ex.: Instagram" value={channel} onChange={event => setChannel(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="publication-url">URL pública (opcional)</Label><Input id="publication-url" type="url" placeholder="https://…" value={publicationUrl} onChange={event => setPublicationUrl(event.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setPublishId(null)}>Cancelar</Button><Button disabled={!channel.trim() || recordPublication.isPending} onClick={() => publishId && recordPublication.mutate({ id: publishId, channel, url: publicationUrl.trim() || undefined })}>Registrar</Button></DialogFooter></DialogContent></Dialog>
    </DashboardLayout>
  );
}
