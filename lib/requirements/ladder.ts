/**
 * The status ladder the applicant sees.
 *
 *   pending           — we don't have it yet
 *   submitted         — they provided it; their instructor hasn't looked yet
 *   approved          — reviewed and accepted
 *   changes_requested — sent back, with a note saying what to fix
 *
 * DERIVED, NEVER STORED. It's computed from ingredients that already exist —
 * the requirement's status, whether evidence is bound, and the latest review —
 * so it cannot drift out of sync the way a fourth stored copy of "where is this
 * up to" inevitably would. `case_req_status` and `document_status` keep their
 * existing meanings and writers.
 *
 * Order matters: satisfied wins over everything (a staff override or a system
 * check can satisfy an item nobody reviewed), then an outstanding change
 * request, then evidence-without-review, then nothing.
 */
export type LadderState = "pending" | "submitted" | "approved" | "changes_requested"

export interface LadderInput {
  /** case_requirements.status */
  status: string
  /** Is any evidence bound — a document, a reference, a cohabitant, a disclosure? */
  hasEvidence: boolean
  /** The most recent review of this item, if there is one. */
  latestReview?: { decision: string } | null
}

export function deriveLadder(input: LadderInput): LadderState {
  if (input.status === "satisfied") return "approved"
  if (input.latestReview?.decision === "changes_requested") return "changes_requested"
  if (input.hasEvidence) return "submitted"
  return "pending"
}

/** Warm, specific copy — this is the applicant's whole sense of where they are. */
export const LADDER_COPY: Record<LadderState, { label: string; hint: string; tone: "muted" | "signal" | "ok" | "warn" }> = {
  pending: {
    label: "Not started",
    hint: "We still need this one.",
    tone: "muted",
  },
  submitted: {
    label: "In review",
    hint: "You've sent this in — your instructor is checking it.",
    tone: "signal",
  },
  approved: {
    label: "Approved",
    hint: "Reviewed and accepted. Nothing more to do here.",
    tone: "ok",
  },
  changes_requested: {
    label: "Needs a fix",
    hint: "Your instructor asked for a small change before this counts.",
    tone: "warn",
  },
}

/**
 * Disclosure items are reviewed by Gun License NYC, never by the trainer — the
 * copy must not imply an instructor read someone's arrest record.
 */
export function reviewerLabel(reviewerKind: string | null | undefined): string {
  return reviewerKind === "trainer" ? "your instructor" : "Gun License NYC"
}
