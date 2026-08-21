/**
 * CONCIERGE Phase 6 — the guided review-&-file model. The done-for-you journey
 * ends HERE, at "review & file" — NEVER "filed". The applicant reviews the
 * documents we prepared, adopts their (already-captured) signature onto the ones
 * that are THEIRS to sign, and then files their OWN NYPD application. By law we
 * never file or represent — this surface guides, it does not submit.
 *
 * The signable-by-applicant allowlist is DELIBERATELY TIGHT: only generate-mode
 * documents the applicant personally signs. It EXCLUDES, by construction:
 *   • REF-01/REF-02 — character references (roster; the reference signs + notarizes)
 *   • COH-01 — cohabitant affidavits (roster; the household member signs)
 *   • the NYPD application itself (not a generated document here — the applicant
 *     fills and submits it on the NYPD portal)
 *   • worksheets (signable: false) — reference sheets, nothing to sign
 */
import { actionFor } from "@/lib/requirements/actions"
import { type CaseStageKey, stageIndex } from "@/config/stages"
import { applicantGroup } from "@/lib/concierge/application-review"
import type { RequirementView } from "@/lib/portal/requirement-view"

export interface ReviewItem {
  reqCode: string
  title: string
  /** Signed URL to view the prepared draft. */
  url: string | null
  /** Signed already (adopted signature applied). */
  signed: boolean
  /** Needs a notary AFTER signing (the applicant takes it to a notary). */
  notarize: boolean
}

/** The applicant personally signs this: a generated doc, not a roster/worksheet. */
export function conciergeSignable(reqCode: string): boolean {
  const a = actionFor(reqCode)
  return !!a && a.mode === "generate" && a.signable !== false
}

/**
 * The documents we've prepared that are the applicant's to sign — drawn from the
 * generated drafts on the case. Signed and unsigned both returned (the UI shows
 * progress); order: unsigned first.
 */
export function buildReviewItems(view: RequirementView): ReviewItem[] {
  const items: ReviewItem[] = []
  for (const [reqCode, doc] of Object.entries(view.generated)) {
    if (!conciergeSignable(reqCode)) continue
    // Disclosure/history documents are signed in the dedicated "Your disclosures"
    // section, not here — don't duplicate them in Review & file.
    if (applicantGroup(reqCode) === "history") continue
    const action = actionFor(reqCode)
    items.push({
      reqCode,
      title: action?.customerTitle ?? view.items.find((i) => i.reqCode === reqCode)?.title ?? reqCode,
      url: doc.url,
      signed: !!doc.signedAt,
      notarize: !!action?.notarize,
    })
  }
  return items.sort((a, b) => Number(a.signed) - Number(b.signed))
}

/**
 * The applicant may file once WE'VE assembled + QA'd the packet — i.e. staff have
 * advanced the case through the CP-5 gate to application_assembled or beyond.
 * This never bypasses the gate; it reads the stage the gate produced.
 */
export function readyToFile(stage: CaseStageKey): boolean {
  return stageIndex(stage) >= stageIndex("application_assembled")
}
