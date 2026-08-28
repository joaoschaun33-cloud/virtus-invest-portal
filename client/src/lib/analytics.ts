import { CONSENT_KEY } from "@/components/CookieConsent";

export type ProductEventName =
  | "guide_goal_selected"
  | "guide_module_opened"
  | "guide_quiz_completed"
  | "guide_completed"
  | "analysis_search"
  | "analysis_loaded"
  | "analysis_failed"
  | "beta_feedback_opened"
  | "beta_session"
  | "asset_detail_loaded"
  | "screener_result_opened"
  | "comparison_completed"
  | "portfolio_transaction_added"
  | "portfolio_import_completed"
  | "portfolio_exported"
  | "alert_created";

type EventValue = string | number | boolean;

const allowedParameters: Record<ProductEventName, readonly string[]> = {
  guide_goal_selected: ["goal"],
  guide_module_opened: ["module"],
  guide_quiz_completed: ["module", "completed"],
  guide_completed: ["modules"],
  analysis_search: ["ticker"],
  analysis_loaded: ["ticker", "source"],
  analysis_failed: ["ticker"],
  beta_feedback_opened: ["location"],
  beta_session: ["retention_bucket"],
  asset_detail_loaded: ["ticker", "asset_type", "source"],
  screener_result_opened: ["ticker", "asset_type"],
  comparison_completed: ["asset_count", "mixed_classes"],
  portfolio_transaction_added: ["transaction_type"],
  portfolio_import_completed: ["imported_count", "rejected_count"],
  portfolio_exported: ["format", "position_count"],
  alert_created: ["condition", "email_enabled"],
};

export function trackProductEvent(
  name: ProductEventName,
  parameters: Record<string, EventValue> = {}
) {
  if (localStorage.getItem(CONSENT_KEY) !== "analytics") return false;
  if (!window.gtag) return false;
  const allowlist = new Set(allowedParameters[name]);
  const safeParameters = Object.fromEntries(
    Object.entries(parameters).filter(([key]) => allowlist.has(key))
  );
  window.gtag("event", name, safeParameters);
  return true;
}
