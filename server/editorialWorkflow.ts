import { randomUUID } from "node:crypto";

export type EditorialSlot = "morning" | "intraday" | "close" | "breaking";
export type EditorialStatus = "draft" | "needs_review" | "approved" | "rejected";

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
