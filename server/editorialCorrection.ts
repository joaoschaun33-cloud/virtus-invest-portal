export type EditorialCorrectionKind = "minor" | "material" | "retraction";

export function validateEditorialCorrection(input: {
  kind: EditorialCorrectionKind;
  reason: string;
  correctionText: string;
  correctionUrl?: string;
}) {
  const reason = input.reason.trim();
  const correctionText = input.correctionText.trim();
  if (reason.length < 3) throw new Error("Informe o motivo objetivo da correção.");
  if (correctionText.length < 10) throw new Error("Informe o texto comunicado ao público.");
  if (input.correctionUrl && !/^https:\/\//i.test(input.correctionUrl))
    throw new Error("A URL da correção precisa usar HTTPS.");
  return { ...input, reason, correctionText, correctionUrl: input.correctionUrl?.trim() || undefined };
}

export function correctionRequiresPause(kind: EditorialCorrectionKind) {
  return kind === "material" || kind === "retraction";
}
