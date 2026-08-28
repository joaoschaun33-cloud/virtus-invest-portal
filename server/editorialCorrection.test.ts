import { describe, expect, it } from "vitest";
import { correctionRequiresPause, validateEditorialCorrection } from "./editorialCorrection";

describe("editorial correction policy", () => {
  it("keeps minor corrections operational and pauses material ones", () => {
    expect(correctionRequiresPause("minor")).toBe(false);
    expect(correctionRequiresPause("material")).toBe(true);
    expect(correctionRequiresPause("retraction")).toBe(true);
  });

  it("requires public wording and a secure correction URL", () => {
    expect(() => validateEditorialCorrection({ kind: "material", reason: "Dado incorreto", correctionText: "curto", correctionUrl: "http://example.com" })).toThrow();
    expect(validateEditorialCorrection({ kind: "material", reason: " Dado incorreto ", correctionText: " Corrigimos o valor anteriormente informado. ", correctionUrl: "https://example.com/correcao" })).toMatchObject({ reason: "Dado incorreto", correctionText: "Corrigimos o valor anteriormente informado." });
  });
});
