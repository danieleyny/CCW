/**
 * PART C / Phase 12 — AI availability flag. ⚖ OFF BY DEFAULT.
 *
 * The disclosure assistant is the highest legal-risk feature in the product: it
 * touches arrest and health narratives. It ships disabled and fails closed —
 * exactly like STRIPE_ENABLED and RON. Turning it on requires BOTH an explicit
 * flag and a configured key, and even then every draft is routed through
 * mandatory human review before it can be used.
 */
export const AI_ENABLED = process.env.AI_ENABLED === "true" && Boolean(process.env.ANTHROPIC_API_KEY)

/** The model the assistant uses when enabled. */
export const AI_MODEL = "claude-opus-4-8"
