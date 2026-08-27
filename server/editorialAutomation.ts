import { listAssets, listEconomicEvents } from "./db";
import { enqueueEditorialDraft } from "./editorialQueue";
import type { EditorialSlot, EditorialSource } from "./editorialWorkflow";
import { getMacroBrief, type MacroBrief } from "./macroData";

type EditorialAsset = {
  ticker: string;
  name: string;
  assetType: string;
  lastPrice: unknown;
  changePercent: unknown;
  source: string;
  updatedAt: Date;
};

type EditorialEvent = {
  title: string;
  eventDate: Date;
  importance: "LOW" | "MEDIUM" | "HIGH";
  sourceName: string;
};

export type EditorialAutomationSnapshot = {
  now: Date;
  assets: EditorialAsset[];
  events: EditorialEvent[];
  macro: MacroBrief;
};

const B3_SOURCE = "https://www.b3.com.br/pt_br/market-data-e-indices/";
const BCB_SOURCE = "https://www.bcb.gov.br/";
const IBGE_SOURCE = "https://www.ibge.gov.br/";

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function formatPoints(value: number) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} pontos`;
}

function bahiaDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bahia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function observedSource(name: string, url: string, official: boolean, now: Date) {
  return { name, url, official, observedAt: now.toISOString() } satisfies EditorialSource;
}

export function buildAutomatedEditorialDraft(
  slot: Exclude<EditorialSlot, "breaking">,
  snapshot: EditorialAutomationSnapshot
) {
  const generationKey = `editorial:${slot}:${bahiaDateKey(snapshot.now)}`;
  if (slot === "morning") {
    const until = snapshot.now.valueOf() + 24 * 60 * 60 * 1000;
    const events = snapshot.events
      .filter(event => {
        const time = event.eventDate.valueOf();
        return time >= snapshot.now.valueOf() && time <= until;
      })
      .sort((left, right) => left.eventDate.valueOf() - right.eventDate.valueOf())
      .slice(0, 3);
    const indicators = snapshot.macro.indicators.slice(0, 3);
    if (!events.length && !indicators.length)
      throw new Error("Sem fatos oficiais suficientes para o briefing da manhã.");
    const eventText = events.length
      ? `Na agenda das próximas 24 horas: ${events.map(event => event.title).join("; ")}.`
      : "Não há evento de alta relevância confirmado na agenda consultada.";
    const indicatorText = indicators.length
      ? `Contexto oficial: ${indicators
          .map(indicator =>
            indicator.unit === "percent"
              ? `${indicator.label} em ${indicator.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
              : `${indicator.id === "usdbrl" ? "Dólar comercial" : indicator.label} em R$ ${indicator.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
          )
          .join("; ")}.`
      : "Indicadores macroeconômicos aguardam atualização das fontes oficiais.";
    return {
      generationKey,
      slot,
      title: "Briefing Virtus · agenda e contexto da manhã",
      body: `${eventText} ${indicatorText} Dados para contexto; não constituem recomendação de investimento.`,
      facts: [
        ...events.map(event => `${event.title} · ${event.eventDate.toISOString()}`),
        ...indicators.map(indicator =>
          `${indicator.label}: ${indicator.value} · referência ${indicator.asOf.toISOString()}`
        ),
      ],
      sources: [
        observedSource("Banco Central do Brasil", BCB_SOURCE, true, snapshot.now),
        ...(indicators.some(indicator => indicator.source === "ibge")
          ? [observedSource("IBGE", IBGE_SOURCE, true, snapshot.now)]
          : []),
      ],
      createdBy: "automacao-editorial@virtus",
      scheduledFor: snapshot.now,
    };
  }

  const quoted = snapshot.assets
    .map(asset => ({
      ...asset,
      price: numberOrNull(asset.lastPrice),
      change: numberOrNull(asset.changePercent),
    }))
    .filter(
      (asset): asset is typeof asset & { price: number; change: number } =>
        asset.price !== null && asset.change !== null
    );
  if (!quoted.length) throw new Error("Sem cotações verificáveis para o rascunho.");
  const source = observedSource("B3", B3_SOURCE, true, snapshot.now);

  if (slot === "intraday") {
    const equities = quoted.filter(asset => asset.assetType !== "INDEX");
    const gain = [...equities].sort((a, b) => b.change - a.change)[0];
    const loss = [...equities].sort((a, b) => a.change - b.change)[0];
    if (!gain || !loss) throw new Error("Cobertura insuficiente para leitura intraday.");
    return {
      generationKey,
      slot,
      title: "Pulso Virtus · movimentos observados",
      body: `Entre os ativos acompanhados, ${gain.ticker} registra ${formatPercent(gain.change)} e ${loss.ticker}, ${formatPercent(loss.change)}. As variações refletem a última referência disponível; não atribuímos causalidade sem fonte confirmada.`,
      facts: [
        `${gain.ticker}: ${gain.price} · ${gain.change}%`,
        `${loss.ticker}: ${loss.price} · ${loss.change}%`,
      ],
      sources: [source],
      createdBy: "automacao-editorial@virtus",
      scheduledFor: snapshot.now,
    };
  }

  const ibov = quoted.find(asset => asset.ticker === "IBOV");
  if (!ibov) throw new Error("Fechamento do Ibovespa indisponível.");
  const asOfKey = bahiaDateKey(ibov.updatedAt);
  const todayKey = bahiaDateKey(snapshot.now);
  if (asOfKey !== todayKey)
    throw new Error(`Fechamento oficial ainda não atualizado para ${todayKey}.`);
  return {
    generationKey,
    slot,
    title: "Fechamento Virtus · mercado brasileiro",
    body: `O Ibovespa encerrou a referência em ${formatPoints(ibov.price)}, com variação de ${formatPercent(ibov.change)}. Fechamento identificado por fonte e data; conteúdo exclusivamente informativo.`,
    facts: [
      `IBOV: ${ibov.price} pontos`,
      `Variação: ${ibov.change}%`,
      `Referência: ${ibov.updatedAt.toISOString()}`,
    ],
    sources: [source],
    createdBy: "automacao-editorial@virtus",
    scheduledFor: snapshot.now,
  };
}

export async function generateEditorialDraft(
  slot: Exclude<EditorialSlot, "breaking">,
  now = new Date()
) {
  const [assets, events, macro] = await Promise.all([
    listAssets(),
    listEconomicEvents(),
    getMacroBrief(),
  ]);
  const draft = buildAutomatedEditorialDraft(slot, { now, assets, events, macro });
  return enqueueEditorialDraft(draft);
}
