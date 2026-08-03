/**
 * PENDING LEGAL REVIEW — staging area for NEW legal claims before publication.
 *
 * ⚠️  Nothing here is published. `tests/facts-pending-not-live.test.ts` fails if
 * anything under app/ or components/ imports this module.
 *
 * WORKFLOW: draft a claim here (with a real primary-source citation), have it
 * reviewed in docs/LEGAL_REVIEW_PENDING_FACTS.md, and on sign-off MOVE the
 * approved entry into content/facts.ts (with a verifiedOn date) — that is the
 * only path a new claim becomes publishable.
 *
 * HISTORY: the first batch (license types, disqualifiers, reciprocity,
 * retired-LEO) was approved 2026-08-02 and promoted to content/facts.ts. This
 * file is intentionally left in place (empty) as the on-ramp for the next batch.
 */

export interface PendingFact {
  key: string
  claim: string
  authority: string
  href: string
  supports: string[]
  reviewPriority: "standard" | "high"
  reviewNote: string
  status: "pending_legal_review"
}

export const PENDING_FACTS: PendingFact[] = []

export const PENDING_FACTS_COUNT = PENDING_FACTS.length
