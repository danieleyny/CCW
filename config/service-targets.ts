/** Owner-adjustable service targets for the staff Today queue. */
export const MESSAGE_REPLY_BUSINESS_DAYS = 1
export const DOCUMENT_REVIEW_BUSINESS_DAYS = 2
/** Pending owner confirmation; used only for reporting, never as a filing rule. */
export const QA_SIGNOFF_DAYS = 3
export const STALLED_DAYS = 14
export const REFERENCE_EXPIRY_WARN_DAYS = 2
export const PAYMENT_FOLLOWUP_DAYS = 7
export const PRIVACY_RESPONSE_DAYS = 30

/**
 * Initial operational targets for the Reports workspace. The 14-day defaults
 * are pending owner confirmation. NYPD-controlled stages intentionally have no
 * target because their timing is outside the team's control.
 */
export const STAGE_TARGET_DAYS = {
  lead: 14,
  eligibility_screened: 14,
  signed_up_paid: 14,
  training_scheduled: 14,
  training_complete: 14,
  document_collection: 14,
  notarization: 14,
  application_assembled: 14,
  licensed: 14,
} as const

