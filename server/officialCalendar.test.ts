import { describe, expect, it } from "vitest";
import {
  assertOfficialBcbScheduleFreshness,
  listOfficialBcbEvents,
} from "./marketProviders";

describe("calendário oficial do Banco Central", () => {
  it("retorna somente eventos futuros dentro da janela e identifica o BCB", () => {
    const events = listOfficialBcbEvents(
      60,
      new Date("2026-08-19T12:00:00-03:00")
    );
    expect(events.length).toBeGreaterThan(0);
    expect(events.every(event => event.source === "bcb")).toBe(true);
    expect(events[0]).toMatchObject({
      title: "Decisão de juros — Copom",
      category: "Juros",
      country: "BR",
      importance: "HIGH",
    });
    expect(
      events.every(event => event.eventDate >= new Date("2026-08-19"))
    ).toBe(true);
  });

  it("sinaliza necessidade de atualização quando a cobertura manual está acabando", () => {
    const { lastScheduledDate, needsUpdate } =
      assertOfficialBcbScheduleFreshness(new Date("2026-08-19T12:00:00-03:00"));
    expect(lastScheduledDate.valueOf()).toBeGreaterThan(0);
    expect(needsUpdate).toBe(false);

    const farFuture = new Date(lastScheduledDate.getTime() + 1000);
    const stale = assertOfficialBcbScheduleFreshness(farFuture);
    expect(stale.needsUpdate).toBe(true);
  });
});
