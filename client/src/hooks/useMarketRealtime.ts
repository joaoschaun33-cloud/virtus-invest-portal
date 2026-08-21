import { useEffect, useState } from "react";
import type { MarketDataSource } from "@shared/marketData";

type RealtimeQuote = {
  ticker: string;
  price: number;
  changePercent: number;
  volume: number;
  source: MarketDataSource;
  asOf: string;
};

export function useMarketRealtime(tickers: string[]) {
  const [quotes, setQuotes] = useState<Record<string, RealtimeQuote>>({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const configuredUrl = import.meta.env.VITE_REALTIME_URL as
      | string
      | undefined;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(
      configuredUrl || `${protocol}//${window.location.host}/api/realtime`
    );
    const requested = tickers.slice(0, 20);
    socket.onopen = () => {
      setConnected(true);
      socket.send(JSON.stringify({ type: "subscribe", tickers: requested }));
    };
    socket.onmessage = event => {
      try {
        const message = JSON.parse(event.data) as {
          type?: string;
          quote?: RealtimeQuote;
        };
        if (message.type === "quote" && message.quote?.ticker) {
          setQuotes(previous => ({
            ...previous,
            [message.quote!.ticker]: message.quote!,
          }));
        }
      } catch {
        // Ignore malformed market messages without breaking the dashboard.
      }
    };
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);
    return () => socket.close();
  }, [tickers.join("|")]);

  return { quotes, connected };
}
