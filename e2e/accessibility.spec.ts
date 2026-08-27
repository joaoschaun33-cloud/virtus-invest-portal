import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const publicJourneys = [
  { path: "/", name: "visão geral" },
  { path: "/guia", name: "guia do iniciante" },
  { path: "/analise", name: "análise fundamentalista" },
  { path: "/markets", name: "mercados" },
  { path: "/screener", name: "screener" },
  { path: "/compare", name: "comparação" },
  { path: "/news", name: "notícias" },
  { path: "/trust", name: "confiança e dados" },
] as const;

async function keepEssentialCookies(page: Page) {
  const button = page.getByRole("button", { name: "Somente essenciais" });
  if (await button.isVisible().catch(() => false)) await button.click();
}

for (const journey of publicJourneys) {
  test(`${journey.name} has no automated WCAG A/AA violations`, async ({ page }) => {
    await page.goto(journey.path, { waitUntil: "networkidle" });
    await keepEssentialCookies(page);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const summary = results.violations.map(violation => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map(node => ({
        target: node.target,
        html: node.html,
        reason: node.failureSummary,
      })),
    }));
    expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
  });
}
