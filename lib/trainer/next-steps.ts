/**
 * "What happens next on this case?" — computed from the requirement feed, never
 * hardcoded, so it can't drift from what's actually outstanding.
 *
 * Three audiences for the answer, in priority order:
 *   1. THE TRAINER — items submitted and waiting on their review. Their queue.
 *   2. THE APPLICANT — items nobody has provided yet. What to chase.
 *   3. GUN LICENSE NYC — everything the trainer can touch is done, so the case
 *      moves to final QA. The trainer's job is finished; ours isn't.
 *
 * Note what's deliberately absent: this never reports on disclosure items,
 * because the trainer's feed doesn't contain them. A trainer being told "3 items
 * remain that you can't see" would disclose their existence.
 */
import type { TrainerRequirement } from "@/lib/trainer/queries"

export type NextStepOwner = "trainer" | "applicant" | "handoff"

export interface TrainerNextStep {
  owner: NextStepOwner
  headline: string
  detail: string
  /** Items waiting on the trainer, for the badge. */
  reviewCount: number
  /** Items the applicant still owes. */
  outstanding: string[]
}

export function computeTrainerNextStep(reqs: TrainerRequirement[]): TrainerNextStep {
  const applicable = reqs.filter((r) => r.status !== "na")
  const reviewable = applicable.filter((r) => r.scope === "full")

  // Provided but not yet accepted — the trainer's own queue.
  const awaitingReview = reviewable.filter((r) => r.documentId && r.status !== "satisfied")

  // Nothing attached yet — the applicant's move.
  const outstanding = applicable
    .filter((r) => !r.documentId && r.status !== "satisfied")
    .map((r) => r.title)

  if (awaitingReview.length > 0) {
    return {
      owner: "trainer",
      headline:
        awaitingReview.length === 1
          ? "1 item needs your review"
          : `${awaitingReview.length} items need your review`,
      detail: awaitingReview.map((r) => r.title).join(" · "),
      reviewCount: awaitingReview.length,
      outstanding,
    }
  }

  if (outstanding.length > 0) {
    const shown = outstanding.slice(0, 3).join(", ")
    return {
      owner: "applicant",
      headline: "Waiting on the applicant",
      detail:
        outstanding.length > 3
          ? `${shown}, and ${outstanding.length - 3} more.`
          : `${shown}.`,
      reviewCount: 0,
      outstanding,
    }
  }

  return {
    owner: "handoff",
    headline: "You're all set on your end",
    detail:
      "Everything you can review is done. Gun License NYC takes it from here for final QA and filing prep — including the parts you don't see.",
    reviewCount: 0,
    outstanding: [],
  }
}
