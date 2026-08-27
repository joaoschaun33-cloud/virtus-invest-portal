import { randomUUID } from "node:crypto";

export type EditorialSlot = "morning" | "intraday" | "close" | "breaking";
export type EditorialStatus =
  | "draft"
  | "needs_review"
  | "approved"
  | "rejected"
  | "published";

export type EditorialSource = {
  name: string;
  url: string;
  official: boolean;
  observedAt: string;
};

export type EditorialDraft = {
  id: string;
  slot: EditorialSlot;
  title: string;
  body: string;
  facts: string[];
  sources: EditorialSource[];
  createdBy: string;
  createdAt: string;
  status: EditorialStatus;
  issues: string[];
  approvedBy?: string;
  approvedAt?: string;
  reviewNote?: string;
  publishedBy?: string;
  publishedAt?: string;
  publishedChannel?: string;
  publishedUrl?: string;
};

const prohibitedPatterns = [
  /\bcompre\b/i,
  /\bvenda\b/i,
  /\bretorno garantido\b/i,
  /\bgarantia de rentabilidade\b/i,
  /\bpre[cç]o[- ]alvo\b/i,
  /\bvai (subir|cair)\b/i,
];

export function validateEditorialDraft(
  input: Pick<EditorialDraft, "slot" | "title" | "body" | "facts" | "sources">
) {
  const issues: string[] = [];
  if (!input.title.trim()) issues.push("Título obrigatório.");
  if (!input.body.trim()) issues.push("Texto obrigatório.");
  if (!input.facts.length) issues.push("Inclua ao menos um fato verificável.");
  if (!input.sources.length) issues.push("Inclua ao menos uma fonte.");
  for (const source of input.sources) {
    if (!/^https:\/\//i.test(source.url))
      issues.push(`A fonte ${source.name} precisa usar HTTPS.`);
    if (Number.isNaN(new Date(source.observedAt).valueOf()))
      issues.push(`A fonte ${source.name} precisa de horário válido.`);
    try {
      const parsed = new URL(source.url);
      if (parsed.username || parsed.password)
        issues.push(`A fonte ${source.name} não pode conter credenciais.`);
    } catch {
      issues.push(`A fonte ${source.name} precisa ter URL válida.`);
    }
  }
  const independentSourceHosts = new Set(
    input.sources.flatMap(source => {
      try {
        return [new URL(source.url).hostname];
      } catch {
        return [];
      }
    })
  );
  if (
    input.slot === "breaking" &&
    !input.sources.some(source => source.official) &&
    independentSourceHosts.size < 2
  ) {
    issues.push("Plantão exige fonte oficial ou duas fontes independentes.");
  }
  const content = `${input.title}\n${input.body}`;
  if (prohibitedPatterns.some(pattern => pattern.test(content)))
    issues.push("O texto contém linguagem prescritiva ou promessa proibida.");
  return Array.from(new Set(issues));
}

export function createEditorialDraft(input: {
  slot: EditorialSlot;
  title: string;
  body: string;
  facts: string[];
  sources: EditorialSource[];
  createdBy: string;
}): EditorialDraft {
  const issues = validateEditorialDraft(input);
  return {
    id: randomUUID(),
    ...input,
    createdAt: new Date().toISOString(),
    status: issues.length ? "draft" : "needs_review",
    issues,
  };
}

export function approveEditorialDraft(
  draft: EditorialDraft,
  reviewer: string
): EditorialDraft {
  if (draft.issues.length) throw new Error("Rascunho possui pendências editoriais.");
  if (draft.status !== "needs_review")
    throw new Error("Rascunho não está aguardando revisão.");
  if (reviewer.trim() === draft.createdBy.trim())
    throw new Error("Autor e aprovador devem ser pessoas diferentes.");
  return {
    ...draft,
    status: "approved",
    approvedBy: reviewer,
    approvedAt: new Date().toISOString(),
  };
}

export function rejectEditorialDraft(
  draft: EditorialDraft,
  reviewer: string,
  note: string
): EditorialDraft {
  if (draft.status !== "needs_review")
    throw new Error("Rascunho não está aguardando revisão.");
  if (reviewer.trim() === draft.createdBy.trim())
    throw new Error("Autor e revisor devem ser pessoas diferentes.");
  if (!note.trim()) throw new Error("Informe o motivo da rejeição.");
  return {
    ...draft,
    status: "rejected",
    approvedBy: reviewer,
    approvedAt: new Date().toISOString(),
    reviewNote: note.trim(),
  };
}

export function recordEditorialPublication(
  draft: EditorialDraft,
  input: { publisher: string; channel: string; url?: string }
): EditorialDraft {
  if (draft.status !== "approved")
    throw new Error("Somente um rascunho aprovado pode ser registrado como publicado.");
  if (!input.publisher.trim() || !input.channel.trim())
    throw new Error("Publicador e canal são obrigatórios.");
  if (input.url && !/^https:\/\//i.test(input.url))
    throw new Error("A URL da publicação precisa usar HTTPS.");
  return {
    ...draft,
    status: "published",
    publishedBy: input.publisher.trim(),
    publishedAt: new Date().toISOString(),
    publishedChannel: input.channel.trim(),
    publishedUrl: input.url?.trim(),
  };
}
