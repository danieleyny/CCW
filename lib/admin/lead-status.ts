export const LEAD_CALL_OUTCOME_ACTION = "lead.call_outcome_recorded"

export interface LeadCallOutcome {
  callCompleted: true
  expressedInterest: true
  conversionStatus: "not_signed_up"
}

/**
 * Activity-log details are JSON and may contain legacy or unrelated shapes.
 * Only the complete three-part signal earns the high-intent lead treatment.
 */
export function interestedUnconvertedLead(detail: unknown): detail is Record<string, unknown> {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) return false
  const value = detail as Record<string, unknown>
  return value.call_completed === true
    && value.expressed_interest === true
    && value.conversion_status === "not_signed_up"
}

export const INTERESTED_LEAD_LAST_STEP = "Intro call completed · interested"
export const INTERESTED_LEAD_NEXT_STEP = "Complete enrollment/payment"
