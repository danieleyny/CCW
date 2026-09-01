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
import { actionFor, actionWetInk } from "@/lib/requirements/actions"
import { type CaseStageKey, stageIndex } from "@/config/stages"
import { isDisclosureItem } from "@/lib/requirements/sections"
import type { RequirementView } from "@/lib/portal/requirement-view"
import type { CurrentDoc } from "@/components/portal/document-uploader"

export interface ReviewItem {
  reqCode: string
  title: string
  /** Signed URL to view the prepared draft / download the form. */
  url: string | null
  /** Signed already (adopted signature applied) — only meaningful for signable items. */
  signed: boolean
  /** The applicant signs this IN-PLATFORM — gets a Sign button. */
  signable: boolean
  /** Wet-ink mode: signed on PAPER before a notary or a witness. Null ⇒ in-platform. */
  wetInk: "notary" | "witness" | null
  /** Document type + current uploaded copy, for the wet-ink completed-copy uploader. */
  documentType: string | null
  current: CurrentDoc | null
}

/**
 * The applicant personally signs this IN-PLATFORM: a generated doc that is NOT
 * wet-ink, not a roster, not a worksheet. DERIVED from the template's wet-ink mode
 * (actionWetInk) so it cannot drift from what signRequirementDocument will actually
 * accept — a notary/witness document is never signed here, full stop.
 */
export function conciergeSignable(reqCode: string): boolean {
  const a = actionFor(reqCode)
  return !!a && a.mode === "generate" && a.signable !== false && !actionWetInk(a)
}

/**
 * Shown in Review & file: a generated document the applicant must ACT on — either
 * sign in-platform, or (wet ink) download, complete on paper before a notary/witness,
 * and upload. Excludes download-only worksheets, which need no action here.
 */
function conciergeReviewable(reqCode: string): boolean {
  const a = actionFor(reqCode)
  if (!a || a.mode !== "generate") return false
  return conciergeSignable(reqCode) || !!actionWetInk(a)
}

/**
 * The documents we've prepared that the applicant must act on — from the generated
 * drafts on the case. Order: unsigned/incomplete first.
 */
export function buildReviewItems(view: RequirementView): ReviewItem[] {
  const items: ReviewItem[] = []
  for (const [reqCode, doc] of Object.entries(view.generated)) {
    if (!conciergeReviewable(reqCode)) continue
    // Disclosure/history documents are signed in the dedicated "Your disclosures"
    // section, not here — don't duplicate them in Review & file.
    if (isDisclosureItem(reqCode)) continue
    const action = actionFor(reqCode)
    items.push({
      reqCode,
      title: action?.customerTitle ?? view.items.find((i) => i.reqCode === reqCode)?.title ?? reqCode,
      url: doc.url,
      signed: !!doc.signedAt,
      signable: conciergeSignable(reqCode),
      wetInk: actionWetInk(action),
      documentType: action?.documentType ?? null,
      current: view.currentByReq?.[reqCode] ?? null,
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
