/** Public training copy. Keep the historic values until the owner reconciles them. */
export const HOURS_COPY = {
  whatYouGet: "16 + 2 hrs",
  phases: "18-hour course",
  planning: "18 h",
  classroom: "15 classroom hours",
} as const // CONFIRM: reconcile the public descriptions with the instructor's final course format.

export const TRAINING_PRICE_RANGE = "$500–650" // CONFIRM: retain the existing public range until the owner confirms the class-price relationship.
export const TRAINING_CLASS_PRICE_CENTS = 60_000

/** Training launch controls; every owner decision is deliberately centralized. */
export const TRAINING_CONFIG = {
  HOURS_COPY: HOURS_COPY.classroom,
  TRAINING_PRICE_RANGE,
  REFUND_POLICY: null as string | null, // CONFIRM: provide policy for eligibility, cancellations, and class cancellations.
  REFUND_POLICY_URL: "/training/refund-policy", // CONFIRM: replace only after REFUND_POLICY text is approved.
  VENDOR_TERMS_URLS: { terms: "", privacy: "", instructorPolicies: "" }, // CONFIRM: owner supplies the three vendor URLs.
  SHOW_INSTRUCTOR_NAME: false, // CONFIRM: instructor name is hidden unless explicitly approved.
  CONFIRMATION_SLA_COPY: "within 1 business day", // CONFIRM: operational service-level promise.
  SHOW_SEATS_LIMITED: true, // CONFIRM: only keep true when a capacity is actually maintained.
  ID_RETENTION_DAYS: 30, // CONFIRM: retention period approved for instructor-required IDs.
  TERMS_VERSION: "training-2026-11", // CONFIRM: bump whenever class/refund terms change.
} as const
export const hasConfirmedRefundPolicy = Boolean(TRAINING_CONFIG.REFUND_POLICY?.trim())
