import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type LiveControlContextType = {
  isLivePaused: boolean;
  toggleLivePause: () => void;
  setLivePaused: (paused: boolean) => void;
  lastUpdate: Date | null;
  markUpdate: () => void;
};

const LiveControlContext = createContext<LiveControlContextType>({
  isLivePaused: false,
  toggleLivePause: () => {},
  setLivePaused: () => {},
  lastUpdate: null,
  markUpdate: () => {},
});

const STORAGE_KEY = "virtus:live-feed-paused";

export function LiveControlProvider({ children }: { children: ReactNode }) {
  const [isLivePaused, setIsLivePaused] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [lastUpdate, setLastUpdate] = useState<Date | null>(() => new Date());

  const setLivePaused = (paused: boolean) => {
    setIsLivePaused(paused);
    try {
      localStorage.setItem(STORAGE_KEY, String(paused));
    } catch {
      // Ignore localStorage errors
    }
    window.dispatchEvent(
      new CustomEvent("virtus:live-toggle", { detail: { isPaused: paused } })
    );
  };

  const toggleLivePause = () => {
    setLivePaused(!isLivePaused);
  };

  const markUpdate = () => {
    setLastUpdate(new Date());
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Hotkey Alt+P para pausar/retomar cotações ao vivo (WCAG 2.2.2)
      if (event.altKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        toggleLivePause();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLivePaused]);

  return (
    <LiveControlContext.Provider
      value={{
        isLivePaused,
        toggleLivePause,
        setLivePaused,
        lastUpdate,
        markUpdate,
      }}
    >
      {children}
    </LiveControlContext.Provider>
  );
}

export function useLiveControl() {
  return useContext(LiveControlContext);
}
