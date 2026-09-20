import { describe, expect, it } from "vitest";
import {
  calculatePortfolioRisk,
  simulateStressScenarios,
  type QuantPosition,
} from "./portfolioQuant";

describe("portfolioQuant", () => {
  const samplePositions: QuantPosition[] = [
    { ticker: "PETR4", assetType: "STOCK", currentValue: 50_000 },
    { ticker: "VALE3", assetType: "STOCK", currentValue: 30_000 },
    { ticker: "HGLG11", assetType: "REIT", currentValue: 20_000 },
  ];

  it("calculates parametric VaR for 1-day and 21-day horizons", () => {
    const risk = calculatePortfolioRisk(samplePositions, 10.5, 15.0);
    expect(risk).not.toBeNull();
    expect(risk?.totalValue).toBe(100_000);

    // VaR 95% 1 dia deve ser positivo e dentro de parâmetros normais de mercado (1% a 4%)
    expect(risk?.var95DailyPercent).toBeGreaterThan(1.0);
    expect(risk?.var95DailyPercent).toBeLessThan(5.0);
    expect(risk?.var95DailyAmount).toBeGreaterThan(1000);

    // VaR 99% deve ser estritamente maior que VaR 95%
    expect(risk?.var99DailyPercent).toBeGreaterThan(risk?.var95DailyPercent ?? 0);

    // VaR mensal (21 dias) deve ser sqrt(21) vezes maior que o diário
    expect(risk?.var95MonthlyPercent).toBeCloseTo(
      (risk?.var95DailyPercent ?? 0) * Math.sqrt(21),
      1
    );

    // CVaR deve ser maior que VaR 95%
    expect(risk?.cvar95DailyPercent).toBeGreaterThan(risk?.var95DailyPercent ?? 0);
  });

  it("calculates Sharpe ratio and risk profile", () => {
    const risk = calculatePortfolioRisk(samplePositions, 10.5, 16.0);
    expect(risk?.sharpeRatio).toBeGreaterThan(0);
    expect(["CONSERVADOR", "MODERADO", "ARROJADO"]).toContain(risk?.riskProfile);
  });

  it("simulates real historical stress scenarios", () => {
    const scenarios = simulateStressScenarios(samplePositions);
    expect(scenarios.length).toBe(4);

    const covid = scenarios.find(s => s.id === "covid-19");
    expect(covid).toBeDefined();
    expect(covid?.severity).toBe("EXTREMA");
    // Em crash de 38% em ações e 19% em FIIs, perda estimada deve ser ~34% do patrimônio
    expect(covid?.estimatedLossPercent).toBeGreaterThan(25);
    expect(covid?.estimatedLossPercent).toBeLessThan(45);
    expect(covid?.estimatedRemainingValue).toBe(
      100_000 - (covid?.estimatedLossAmount ?? 0)
    );

    const joesley = scenarios.find(s => s.id === "joesley-day");
    expect(joesley).toBeDefined();
    expect(joesley?.estimatedLossPercent).toBeGreaterThan(5);
    expect(joesley?.estimatedLossPercent).toBeLessThan(20);
  });

  it("handles empty or zero-value positions gracefully", () => {
    expect(calculatePortfolioRisk([])).toBeNull();
    expect(
      calculatePortfolioRisk([{ ticker: "TEST", currentValue: 0 }])
    ).toBeNull();
    expect(simulateStressScenarios([])).toEqual([]);
  });
});
