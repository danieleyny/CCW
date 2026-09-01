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
export type LadderState = "pending" | "waiting" | "submitted" | "approved" | "changes_requested"

export interface LadderInput {
  /** case_requirements.status */
  status: string
  /** Is any evidence bound — a document, a reference, a cohabitant, a disclosure? */
  hasEvidence: boolean
  /** The most recent review of this item, if there is one. */
  latestReview?: { decision: string } | null
  /**
   * The status of the current UPLOADED document for this requirement, if any
   * (documents.status). It's the truth the upload widget shows, so the card
   * must agree with it: an approved document reads "approved" even if the
   * requirement row's status/binding lagged behind (e.g. IDN-03, whose registry
   * document_type is NULL, so the staff-approval cascade couldn't match it).
   */
  docStatus?: string | null
  /**
   * Roster items (references / cohabitant affidavits): invitations are out and
   * we're waiting on OTHER people to complete and notarize. There's no bound
   * evidence yet, but the item is genuinely in progress — not "not started".
   */
  rosterInvited?: boolean
}

export function deriveLadder(input: LadderInput): LadderState {
  if (input.status === "satisfied" || input.docStatus === "approved") return "approved"
  if (input.latestReview?.decision === "changes_requested" || input.docStatus === "rejected")
    return "changes_requested"
  if (input.hasEvidence) return "submitted"
  if (input.rosterInvited) return "waiting"
  return "pending"
}

/**
 * Does the requirement hold the artefact that ACTUALLY COMPLETES it — never our
 * own unsigned/un-notarized generated draft, which is bound as `document_id` the
 * moment it's generated. This is the difference between "we made you a draft" and
 * "the thing that finishes this is in." Feeds `hasEvidence` above.
 *
 *   generate + signable  → the draft is SIGNED (signed_at set)
 *   generate + wet-ink   → a completed, UPLOADED (non-draft) copy is in
 *   obtain / attest      → a bound document or an uploaded file
 *   roster               → the third-party evidence (reference / cohabitant) is bound
 */
export function hasCompletingEvidence(input: {
  mode: string | undefined
  /** The generate requirement needs a notary/witness — i.e. an uploaded wet-ink copy. */
  wetInk: boolean
  /** The generated draft has been signed (documents.signed_at set). */
  signedAt: boolean
  /** A non-generated uploaded copy exists (the upload widget's current doc). */
  hasUpload: boolean
  /** case_requirements.document_id is bound (may point at our own draft). */
  documentId: boolean
  /** reference_id or cohabitant_id is bound (roster evidence). */
  rosterBound: boolean
}): boolean {
  if (input.mode === "generate") {
    // Our generated draft never counts on its own; only its completion does.
    return input.wetInk ? input.hasUpload : input.signedAt
  }
  return input.documentId || input.rosterBound || input.hasUpload
}

/** Warm, specific copy — this is the applicant's whole sense of where they are.
 *  Three-state completed treatment (R3): outstanding → muted (no accent),
 *  needs-you → BRASS ("your turn," and nothing else is brass), received → SIGNAL
 *  (server-confirmed, "we're checking this"), approved → green. Green is earned only
 *  by staff acceptance; a received document is never green, never brass. */
export const LADDER_COPY: Record<LadderState, { label: string; hint: string; tone: "muted" | "signal" | "brass" | "ok" | "warn" }> = {
  pending: {
    label: "Not started",
    hint: "We still need this one.",
    tone: "brass", // your turn
  },
  waiting: {
    label: "Waiting on others",
    hint: "Invitations are out — this completes when their notarized copies come back.",
    tone: "muted", // depends on someone else, not you
  },
  submitted: {
    label: "Received",
    hint: "We've got it — a reviewer is checking it. Nothing more to do here for now.",
    tone: "signal", // received, not yet accepted
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
