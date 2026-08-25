import { describe, expect, it } from "vitest";
import {
  approveEditorialDraft,
  createEditorialDraft,
  validateEditorialDraft,
} from "./editorialWorkflow";

const officialSource = {
  name: "Banco Central do Brasil",
  url: "https://www.bcb.gov.br/",
  official: true,
  observedAt: "2026-08-25T10:00:00.000Z",
};

describe("editorial workflow", () => {
  it("accepts a sourced informational market draft", () => {
    const draft = createEditorialDraft({
      slot: "morning",
      title: "Agenda econômica desta manhã",
      body: "O Copom divulga a ata às 8h. Confira a fonte e o horário.",
      facts: ["Ata do Copom prevista para 8h"],
      sources: [officialSource],
      createdBy: "redacao@virtus",
    });
    expect(draft.status).toBe("needs_review");
    expect(draft.issues).toEqual([]);
  });

  it("blocks prescriptive language and an unsupported breaking item", () => {
    const issues = validateEditorialDraft({
      slot: "breaking",
      title: "Compre agora",
      body: "O ativo vai subir.",
      facts: ["Rumor não confirmado"],
      sources: [{ ...officialSource, official: false }],
    });
    expect(issues).toContain("Plantão exige fonte oficial ou duas fontes independentes.");
    expect(issues).toContain("O texto contém linguagem prescritiva ou promessa proibida.");
  });

  it("requires four-eyes approval", () => {
    const draft = createEditorialDraft({
      slot: "close",
      title: "Fechamento do mercado",
      body: "O índice encerrou a sessão conforme o dado da fonte.",
      facts: ["Fechamento confirmado"],
      sources: [officialSource],
      createdBy: "autor@virtus",
    });
    expect(() => approveEditorialDraft(draft, "autor@virtus")).toThrow(
      "Autor e aprovador"
    );
    expect(approveEditorialDraft(draft, "editor@virtus").status).toBe("approved");
  });
});
