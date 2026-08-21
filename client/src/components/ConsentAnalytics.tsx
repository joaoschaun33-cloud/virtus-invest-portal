import { useEffect } from "react";
import { useLocation } from "wouter";

const CONSENT_KEY = "virtus-cookie-consent-v1";
const measurementId = import.meta.env.VITE_ANALYTICS_ID as string | undefined;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function enableAnalytics() {
  if (!measurementId || document.querySelector("script[data-virtus-analytics]"))
    return;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = (...args: unknown[]) => window.dataLayer?.push(args);
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { anonymize_ip: true });
  const script = document.createElement("script");
  script.async = true;
  script.dataset.virtusAnalytics = "true";
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
}

export function ConsentAnalytics() {
  const [location] = useLocation();

  useEffect(() => {
    if (localStorage.getItem(CONSENT_KEY) === "analytics") enableAnalytics();
    const onConsent = (event: Event) => {
      if ((event as CustomEvent).detail === "analytics") enableAnalytics();
    };
    window.addEventListener("virtus:consent", onConsent);
    return () => window.removeEventListener("virtus:consent", onConsent);
  }, []);

  useEffect(() => {
    if (window.gtag) window.gtag("event", "page_view", { page_path: location });
  }, [location]);

  return null;
}
