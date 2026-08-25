import { CONSENT_KEY } from "@/components/CookieConsent";

export type ProductEventName =
  | "guide_goal_selected"
  | "guide_module_opened"
  | "guide_quiz_completed"
  | "guide_completed"
  | "analysis_search"
  | "analysis_loaded"
  | "analysis_failed"
  | "beta_feedback_opened";

type EventValue = string | number | boolean;

export function trackProductEvent(
  name: ProductEventName,
  parameters: Record<string, EventValue> = {}
) {
  if (localStorage.getItem(CONSENT_KEY) !== "analytics") return false;
  if (!window.gtag) return false;
  window.gtag("event", name, parameters);
  return true;
}
