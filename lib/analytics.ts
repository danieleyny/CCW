/**
 * SEO V2 Phase 6 — conversion-event tracking.
 *
 * The GA4 tag (components/analytics/google-analytics.tsx) is rendered by the root
 * layout ONLY on the production deploy, so `window.gtag` simply does not exist on
 * localhost or preview builds. `trackEvent` therefore no-ops everywhere except
 * production — no env check needed, and dev/preview traffic can never pollute the
 * data. See SEO_MEASUREMENT_NOTES.md for which of these to mark as conversions.
 */

export type ConversionEvent =
  | "eligibility_start" // first answer on the /eligibility quiz
  | "eligibility_complete" // reached the quiz result
  | "checklist_generated" // a personalized /checklist was produced
  | "contact_submitted" // a lead form was submitted (contact or checklist capture)
  | "pricing_viewed" // the /pricing page was viewed
  | "admin_pipeline_viewed" // staff opened the read-only pipeline or leads board
  | "admin_cases_viewed" // staff opened the read-only case list
  | "admin_case_preview_opened" // staff opened a safe case preview
  | "admin_case_tab_viewed" // staff opened a case workspace tab
  | "admin_stage_dialog_opened" // staff opened the guarded stage/status dialog
  | "admin_stage_change_blocked" // stage preview or server enforcement refused a move

export function trackEvent(event: ConversionEvent, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return
  const gtag = window.gtag
  if (typeof gtag !== "function") return // GA only loads in production → silent elsewhere
  gtag("event", event, params ?? {})
}
