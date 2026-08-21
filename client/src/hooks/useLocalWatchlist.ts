import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "virtus-local-watchlist-v1";

function readStoredIds() {
  if (typeof window === "undefined") return [] as number[];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is number => Number.isInteger(value) && value > 0) : [];
  } catch {
    return [];
  }
}

export function useLocalWatchlist() {
  const [ids, setIds] = useState<number[]>(readStoredIds);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids]);

  const toggle = useCallback((assetId: number) => {
    setIds(current => current.includes(assetId) ? current.filter(id => id !== assetId) : [...current, assetId]);
  }, []);

  const clear = useCallback(() => setIds([]), []);

  return { ids, toggle, clear };
}
