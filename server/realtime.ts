import type { Server } from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { fetchLiveQuote } from "./marketProviders";
import { getAssetByTicker } from "./db";

const defaultTickers = ["IBOV", "SPX", "IXIC", "BTC/USD", "BZ=F"];
const MAX_CLIENTS = 250;
const MAX_TICKERS_PER_CLIENT = 20;
const QUOTE_CACHE_MS = 12_000;
const tickerPattern = /^[A-Z0-9./=^-]{1,32}$/;

type Client = { socket: WebSocket; tickers: Set<string> };

export function registerMarketRealtime(server: Server) {
  const wss = new WebSocketServer({ server, path: "/api/realtime" });
  const clients = new Set<Client>();
  const quoteCache = new Map<string, { value: Awaited<ReturnType<typeof fetchLiveQuote>>; fetchedAt: number }>();
  let refreshTimer: ReturnType<typeof setInterval> | null = null;

  const getQuote = async (ticker: string) => {
    const cached = quoteCache.get(ticker);
    if (cached && Date.now() - cached.fetchedAt < QUOTE_CACHE_MS) return cached.value;
    const asset = await getAssetByTicker(ticker);
    if (!asset) return null;
    const value = await fetchLiveQuote(asset.ticker, asset.assetType);
    quoteCache.set(ticker, { value, fetchedAt: Date.now() });
    return value;
  };

  const broadcast = async () => {
    const clientList = Array.from(clients);
    const tickers = Array.from(new Set(clientList.flatMap(client => Array.from(client.tickers))));
    const quotes = await Promise.all(tickers.map(async ticker => [ticker, await getQuote(ticker)] as const));
    const quoteByTicker = new Map(quotes);
    clientList.forEach(client => {
      if (client.socket.readyState === 1) {
        Array.from(client.tickers).forEach(ticker => {
          const quote = quoteByTicker.get(ticker);
          if (quote) client.socket.send(JSON.stringify({ type: "quote", quote }));
        });
      }
    });
  };

  const stopTimerIfIdle = () => {
    if (clients.size === 0 && refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  };

  wss.on("connection", socket => {
    if (clients.size >= MAX_CLIENTS) {
      socket.close(1013, "Capacidade de dados em tempo real atingida.");
      return;
    }
    const client: Client = { socket, tickers: new Set(defaultTickers) };
    clients.add(client);
    socket.send(JSON.stringify({ type: "ready", transport: "websocket", tickers: defaultTickers }));
    if (!refreshTimer) refreshTimer = setInterval(() => void broadcast(), 12000);
    void broadcast();

    let messagesInWindow = 0;
    const messageWindow = setInterval(() => { messagesInWindow = 0; }, 60_000);
    socket.on("message", raw => {
      try {
        messagesInWindow += 1;
        if (messagesInWindow > 30) {
          socket.close(1008, "Limite de mensagens excedido.");
          return;
        }
        const message = JSON.parse(raw.toString()) as { type?: string; tickers?: string[] };
        if (message.type === "subscribe" && Array.isArray(message.tickers)) {
          client.tickers = new Set(message.tickers
            .map(ticker => ticker.trim().toUpperCase())
            .filter(ticker => tickerPattern.test(ticker))
            .slice(0, MAX_TICKERS_PER_CLIENT));
          socket.send(JSON.stringify({ type: "subscribed", tickers: Array.from(client.tickers) }));
          void broadcast();
        }
      } catch {
        socket.send(JSON.stringify({ type: "error", message: "Mensagem inválida." }));
      }
    });

    socket.on("close", () => {
      clearInterval(messageWindow);
      clients.delete(client);
      stopTimerIfIdle();
    });
  });
}
