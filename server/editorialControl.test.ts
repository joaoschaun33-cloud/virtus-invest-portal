import { describe, expect, it } from "vitest";
import { assertEditorialOperationActive } from "./editorialControl";

describe("editorial operation kill switch", () => {
  it("allows work while the operation is active", () => {
    expect(() => assertEditorialOperationActive({ paused: false }, "gerar")).not.toThrow();
  });

  it("blocks generation and publication with the audited reason", () => {
    const state = { paused: true, reason: "Revisão de dado incorreto" };
    expect(() => assertEditorialOperationActive(state, "gerar")).toThrow("não é possível gerar");
    expect(() => assertEditorialOperationActive(state, "publicar")).toThrow("Revisão de dado incorreto");
  });
});
