import { chromium } from "@playwright/test";

const target = process.env.PUBLIC_SITE_URL ?? "https://www.virtusinvestimentos.com.br";
const measurementId = process.env.VITE_ANALYTICS_ID ?? "G-PXP1N8XFTH";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const analyticsRequests: string[] = [];
  page.on("request", request => {
    const url = request.url();
    if (url.includes("googletagmanager") || url.includes("google-analytics")) analyticsRequests.push(url);
  });
  await page.goto(target, { waitUntil: "networkidle" });
  if (analyticsRequests.length) throw new Error("Analytics carregou antes do consentimento.");
  await page.getByRole("button", { name: "Aceitar métricas" }).click();
  await page.waitForTimeout(2_500);
  const state = await page.evaluate(() => ({
    consent: localStorage.getItem("virtus-cookie-consent-v1"),
    firstSeen: localStorage.getItem("virtus-analytics-first-seen-v1"),
    sessionRecorded: sessionStorage.getItem("virtus-beta-session-recorded-v1"),
    gtag: Boolean(window.gtag),
  }));
  if (state.consent !== "analytics" || !state.firstSeen || state.sessionRecorded !== "1" || !state.gtag)
    throw new Error(`Estado consentido incompleto: ${JSON.stringify(state)}`);
  if (!analyticsRequests.some(url => url.includes(measurementId)))
    throw new Error("Script de métricas não foi solicitado após o consentimento.");
  console.log(JSON.stringify({ status: "ok", target, blockedBeforeConsent: true, enabledAfterConsent: true, sessionRecorded: true }, null, 2));
} finally {
  await browser.close();
}
