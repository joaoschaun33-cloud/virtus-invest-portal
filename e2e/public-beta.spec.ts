import { expect, test, type Page } from "@playwright/test";

async function keepEssentialCookies(page: Page) {
  const button = page.getByRole("button", { name: "Somente essenciais" });
  if (await button.isVisible().catch(() => false)) await button.click();
}

test("home exposes the primary beta journeys without browser errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await keepEssentialCookies(page);
  await expect(page.getByRole("heading", { name: /Clareza para cada decisão/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /começar pelo guia/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Explorar mercados/i })).toBeVisible();
  const valePulse = page
    .getByRole("link", { name: /VALE3/ })
    .filter({ hasText: /R\$\s*\d/ })
    .filter({ hasText: /%/ });
  await expect(valePulse.first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("guide supports goal selection and learning progress", async ({ page }) => {
  await page.goto("/guia");
  await keepEssentialCookies(page);
  await page.getByRole("button", { name: /Começar a analisar/ }).click();
  await expect(page.getByLabel("Sua trilha sugerida")).toBeVisible();
  await page.getByRole("button", { name: /Risco, retorno e liquidez/ }).click();
  await expect(page.getByText(/O que normalmente acontece ao buscar maior retorno/)).toBeVisible();
  await page.getByRole("button", { name: /Composição · não iniciado/ }).click();
  await expect(
    page.getByRole("button", { name: "Organizar minha carteira manual" })
  ).toBeVisible();
});

test("fundamental analysis loads a real Brazilian ticker", async ({ page }) => {
  await page.goto("/analise");
  await keepEssentialCookies(page);
  await page.getByLabel("Ticker do ativo").fill("PETR4");
  await page.getByRole("button", { name: "Buscar dados" }).click();
  await expect(page.getByText(/PETR4 ·/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Benjamin Graham")).toBeVisible();
});

test("privacy preferences can be reopened and changed", async ({ page }) => {
  await page.goto("/trust");
  await keepEssentialCookies(page);
  await page.getByRole("button", { name: "Gerenciar métricas" }).click();
  await expect(page.getByRole("heading", { name: "Sua privacidade importa" })).toBeVisible();
  await page.getByRole("button", { name: "Somente essenciais" }).click();
  const record = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("virtus-cookie-consent-record-v1") ?? "null")
  );
  expect(record).toMatchObject({ value: "necessary", policyVersion: "2026-08-25" });
});

test("mobile home remains stable and has no horizontal overflow", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "mobile-only assertion");
  await page.addInitScript(() => {
    (window as typeof window & { __virtusLayoutShifts: number[] }).__virtusLayoutShifts = [];
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
        if (!shift.hadRecentInput)
          (window as typeof window & { __virtusLayoutShifts: number[] }).__virtusLayoutShifts.push(shift.value);
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/");
  await keepEssentialCookies(page);
  await page.waitForTimeout(4_000);
  const result = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    cls: (window as typeof window & { __virtusLayoutShifts: number[] }).__virtusLayoutShifts.reduce(
      (total, value) => total + value,
      0
    ),
  }));
  expect(result.overflow).toBe(0);
  expect(result.cls).toBeLessThan(0.1);
});
