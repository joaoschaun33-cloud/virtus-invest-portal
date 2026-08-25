import { useEffect } from "react";
import { useLocation } from "wouter";
import {
  CONSENT_KEY,
  type CookieConsentValue,
} from "@/components/CookieConsent";

const measurementId = import.meta.env.VITE_ANALYTICS_ID as string | undefined;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function enableAnalytics() {
  if (!measurementId) return;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = (...args: unknown[]) => window.dataLayer?.push(args);
  window.gtag("consent", "update", { analytics_storage: "granted" });
  if (document.querySelector("script[data-virtus-analytics]")) return;
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { anonymize_ip: true });
  const script = document.createElement("script");
  script.async = true;
  script.dataset.virtusAnalytics = "true";
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
}

function disableAnalytics() {
  window.gtag?.("consent", "update", { analytics_storage: "denied" });
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0]?.trim();
    if (name === "_ga" || name?.startsWith("_ga_")) {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    }
  }
}

export function ConsentAnalytics() {
  const [location] = useLocation();

  useEffect(() => {
    if (localStorage.getItem(CONSENT_KEY) === "analytics") enableAnalytics();
    const onConsent = (event: Event) => {
      const value = (event as CustomEvent<CookieConsentValue>).detail;
      if (value === "analytics") enableAnalytics();
      else disableAnalytics();
    };
    window.addEventListener("virtus:consent", onConsent);
    return () => window.removeEventListener("virtus:consent", onConsent);
  }, []);

  useEffect(() => {
    if (window.gtag) window.gtag("event", "page_view", { page_path: location });
  }, [location]);

  return null;
}
