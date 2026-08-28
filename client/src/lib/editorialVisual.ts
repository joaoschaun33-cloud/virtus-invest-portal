export type EditorialVisualFormat = "feed" | "square" | "story" | "linkedin";

export type EditorialVisualInput = {
  slot: "morning" | "intraday" | "close" | "breaking";
  title: string;
  facts: string[];
  sources: Array<{ name: string; observedAt: string }>;
  createdAt: string;
  logoDataUrl?: string;
};

export const editorialVisualFormats = {
  feed: { label: "Instagram · retrato", width: 1080, height: 1350 },
  square: { label: "Instagram · quadrado", width: 1080, height: 1080 },
  story: { label: "Stories", width: 1080, height: 1920 },
  linkedin: { label: "LinkedIn", width: 1200, height: 627 },
} as const;

const slotLabels = {
  morning: "ABERTURA",
  intraday: "PULSO DO MERCADO",
  close: "FECHAMENTO",
  breaking: "PLANTÃO",
} as const;

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapText(value: string, maxCharacters: number, maxLines: number) {
  const words = value.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxCharacters) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word.slice(0, maxCharacters);
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  const wasTruncated = words.join(" ") !== lines.join(" ");
  if (wasTruncated && lines.length) lines[lines.length - 1] = `${lines.at(-1)!.replace(/[.,;:]$/, "")}…`;
  return lines.map(escapeXml);
}

function safeDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "referência não informada"
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(date);
}

function textLines(lines: string[], x: number, y: number, size: number, lineHeight: number, weight = 700) {
  return `<text x="${x}" y="${y}" fill="#F7F7F7" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}">${lines.map((line, index) => `<tspan x="${x}" dy="${index ? lineHeight : 0}">${line}</tspan>`).join("")}</text>`;
}

export function createEditorialVisualSvg(input: EditorialVisualInput, format: EditorialVisualFormat) {
  const { width, height } = editorialVisualFormats[format];
  const horizontal = format === "linkedin";
  const story = format === "story";
  const margin = horizontal ? 72 : 76;
  const titleSize = horizontal ? 55 : story ? 72 : 64;
  const titleWidth = horizontal ? 29 : 25;
  const titleLines = wrapText(input.title, titleWidth, horizontal ? 3 : 4);
  const titleBottom = (horizontal ? 178 : story ? 300 : 236) + titleLines.length * (horizontal ? 62 : story ? 82 : 74);
  const factLimit = horizontal ? 2 : 3;
  const factSize = horizontal ? 25 : story ? 34 : 29;
  const factChars = horizontal ? 50 : story ? 37 : 42;
  const factLineHeight = factSize + 10;
  const availableFacts = input.facts.slice(0, factLimit);
  const sourceNames = Array.from(new Set(input.sources.map(source => source.name.trim()).filter(Boolean))).slice(0, 2);
  const reference = input.sources[0]?.observedAt ?? input.createdAt;
  let factY = titleBottom + (horizontal ? 14 : 46);
  const facts = availableFacts.map((fact, index) => {
    const lines = wrapText(fact, factChars, horizontal ? 2 : 3);
    const blockHeight = Math.max(horizontal ? 72 : 96, lines.length * factLineHeight + 34);
    const block = `<g><circle cx="${margin + 14}" cy="${factY - 8}" r="9" fill="${index === 0 ? "#3CF7E5" : "#F93943"}"/>${textLines(lines, margin + 42, factY, factSize, factLineHeight, 500)}</g>`;
    factY += blockHeight;
    return block;
  }).join("");
  const logo = input.logoDataUrl
    ? `<image href="${escapeXml(input.logoDataUrl)}" x="${margin}" y="${horizontal ? 48 : 72}" width="${horizontal ? 212 : 252}" height="${horizontal ? 51 : 61}" preserveAspectRatio="xMinYMid meet"/>`
    : `<text x="${margin}" y="${horizontal ? 89 : 121}" fill="#F7F7F7" font-family="Arial, Helvetica, sans-serif" font-size="${horizontal ? 46 : 54}" font-weight="800">virtus</text>`;
  const footerY = height - (horizontal ? 54 : 84);
  const sourceLabel = sourceNames.length ? `Fonte: ${sourceNames.join(" + ")}` : "Fontes verificadas na revisão editorial";
  const displayDate = safeDate(reference);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(input.title)}">
  <rect width="${width}" height="${height}" fill="#0A0A0A"/>
  <rect x="0" y="0" width="18" height="${height}" fill="#F93943"/>
  <circle cx="${width - (horizontal ? 70 : 92)}" cy="${horizontal ? 72 : 104}" r="${horizontal ? 50 : 66}" fill="#F93943" opacity=".14"/>
  <circle cx="${width - (horizontal ? 70 : 92)}" cy="${horizontal ? 72 : 104}" r="${horizontal ? 21 : 28}" fill="#3CF7E5" opacity=".9"/>
  ${logo}
  <text x="${margin}" y="${horizontal ? 145 : story ? 242 : 190}" fill="#F93943" font-family="Arial, Helvetica, sans-serif" font-size="${horizontal ? 19 : 22}" font-weight="700" letter-spacing="4">${slotLabels[input.slot]}</text>
  ${textLines(titleLines, margin, horizontal ? 200 : story ? 322 : 258, titleSize, horizontal ? 62 : story ? 82 : 74)}
  <line x1="${margin}" y1="${titleBottom + (horizontal ? -8 : 12)}" x2="${width - margin}" y2="${titleBottom + (horizontal ? -8 : 12)}" stroke="#F7F7F7" opacity=".18"/>
  ${facts}
  <rect x="${margin}" y="${footerY - (horizontal ? 48 : 66)}" width="${width - margin * 2}" height="1" fill="#F7F7F7" opacity=".2"/>
  <text x="${margin}" y="${footerY - 18}" fill="#F7F7F7" opacity=".74" font-family="Arial, Helvetica, sans-serif" font-size="${horizontal ? 15 : 18}">${escapeXml(sourceLabel)} · ${escapeXml(displayDate)}</text>
  <text x="${margin}" y="${footerY + 12}" fill="#F7F7F7" opacity=".58" font-family="Arial, Helvetica, sans-serif" font-size="${horizontal ? 13 : 16}">Conteúdo informativo. Não é recomendação de investimento.</text>
  <text x="${width - margin}" y="${footerY + 12}" text-anchor="end" fill="#3CF7E5" font-family="Arial, Helvetica, sans-serif" font-size="${horizontal ? 14 : 17}" font-weight="700">virtusinvestimentos.com.br</text>
  </svg>`;
}

export function editorialVisualFilename(title: string, format: EditorialVisualFormat, extension: "png" | "svg") {
  const slug = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "conteudo";
  return `virtus-${slug}-${format}.${extension}`;
}
