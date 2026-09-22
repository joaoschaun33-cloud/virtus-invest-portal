import { useEffect, useRef, useState } from "react";
import type { MarketDataFreshness, MarketDataSource } from "@shared/marketData";
import { useLiveControl } from "@/contexts/LiveControlContext";

type RealtimeQuote = {
  ticker: string;
  price: number;
  changePercent: number;
  volume: number;
  source: MarketDataSource;
  asOf: string;
  freshness?: MarketDataFreshness;
  isDemo?: boolean;
};

const PRODUCTION_REALTIME_URL =
  "wss://virtus-web-ysuazn5yga-rj.a.run.app/api/realtime";

export function useMarketRealtime(tickers: string[]) {
  const { isLivePaused, markUpdate } = useLiveControl();
  const [quotes, setQuotes] = useState<Record<string, RealtimeQuote>>({});
  const [connected, setConnected] = useState(false);
  const isPausedRef = useRef(isLivePaused);

  useEffect(() => {
    isPausedRef.current = isLivePaused;
  }, [isLivePaused]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const configuredUrl = import.meta.env.VITE_REALTIME_URL as
      | string
      | undefined;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const fallbackUrl = `${protocol}//${window.location.host}/api/realtime`;
    const socket = new WebSocket(
      configuredUrl || fallbackUrl
    );
    const requested = tickers.slice(0, 20);
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "subscribe", tickers: requested }));
    };
    socket.onmessage = event => {
      try {
        const message = JSON.parse(event.data) as {
          type?: string;
          quote?: RealtimeQuote;
        };
        if (message.type === "ready") {
          setConnected(true);
        } else if (message.type === "quote" && message.quote?.ticker) {
          if (!isPausedRef.current) {
            markUpdate();
            setQuotes(previous => ({
              ...previous,
              [message.quote!.ticker]: message.quote!,
            }));
          }
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
