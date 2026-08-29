export function roleForConfiguredAdmin(
  email: string | null | undefined,
  configuredAdminEmail: string | null | undefined
): "admin" | "user" {
  const candidate = email?.trim().toLowerCase();
  const configured = configuredAdminEmail?.trim().toLowerCase();
  return candidate && configured && candidate === configured ? "admin" : "user";
}
