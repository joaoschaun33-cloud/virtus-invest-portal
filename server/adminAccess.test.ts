import { describe, expect, it } from "vitest";
import { roleForConfiguredAdmin } from "./adminAccess";

describe("configured administrator access", () => {
  it("grants admin only to the exact configured email", () => {
    expect(roleForConfiguredAdmin(" JOaoschaun@GMAIL.com ", "joaoschaun@gmail.com")).toBe("admin");
    expect(roleForConfiguredAdmin("adm@virtusinvestimentos.com.br", "joaoschaun@gmail.com")).toBe("user");
  });

  it("fails closed when email or configuration is absent", () => {
    expect(roleForConfiguredAdmin(null, "joaoschaun@gmail.com")).toBe("user");
    expect(roleForConfiguredAdmin("joaoschaun@gmail.com", undefined)).toBe("user");
  });
});
