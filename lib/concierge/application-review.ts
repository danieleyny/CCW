import { actionFor } from "@/lib/requirements/actions"
import type { RequirementView } from "@/lib/portal/requirement-view"

/**
 * CONCIERGE UX Phase 3 — the read-only "Your application" surface. A concierge
 * applicant paid NOT to work an upload list, so /portal/documents shows the WHOLE
 * application, grouped, with the important column being WHO HAS IT and a
 * last-activity stamp that proves motion between logins. Nothing is actionable in
 * place; a genuinely-theirs item just links back into the vault or disclosures.
 *
 * NOTE: this grouping is `applicantGroup` — an APPLICANT-facing concept,
 * deliberately SEPARATE from `requirements.concierge_scope` (which governs what an
 * engaged TRAINER may see and has RLS behind it). Do not conflate the two.
 */

export type ApplicantGroup = "identity" | "training" | "history" | "people" | "prepared" | "filing"

export const REVIEW_GROUPS: { key: ApplicantGroup; label: string }[] = [
  { key: "identity", label: "Identity & residence" },
  { key: "training", label: "Training" },
  { key: "history", label: "Your history & disclosures" },
  { key: "people", label: "The people we contact" },
  { key: "prepared", label: "Documents we prepare" },
  { key: "filing", label: "Filing" },
]

export function applicantGroup(reqCode: string): ApplicantGroup {
  const p = reqCode.split("-")[0]
  if (["IDN", "RES", "DMV"].includes(p)) return "identity"
  if (["TRN", "RNW"].includes(p)) return "training"
  if (["DSC", "ARR", "OOP", "DIR", "QUE", "GMC", "SOC", "MIL", "NAM", "OOS"].includes(p)) return "history"
  if (["REF", "COH"].includes(p)) return "people"
  if (["AFF", "SAF"].includes(p)) return "prepared"
  return "filing"
}

/**
 * The concierge-page anchor a "Go" link should land on for a requirement. The
 * vault collapses the ID family (IDN-02/03 are covered by the IDN-01 photo-ID
 * card), so those point at IDN-01; everything else is its own card by req code.
 */
export function vaultAnchor(reqCode: string): string {
  if (reqCode === "IDN-02" || reqCode === "IDN-03") return "IDN-01"
  return reqCode
}

export type ReviewTone = "ok" | "progress" | "todo" | "waiting"

export interface ReviewRow {
  reqCode: string
  title: string
  status: string
  tone: ReviewTone
  /** Who currently holds it / whose move it is. */
  whoHasIt: string
  /** ISO timestamp of the last change, or null. */
  lastActivity: string | null
  /** If it's genuinely theirs to do, where to go — never actionable in place. */
  actionHref: string | null
}

export interface ReviewGroupData {
  key: ApplicantGroup
  label: string
  rows: ReviewRow[]
}

function derive(
  item: RequirementView["items"][number],
  view: RequirementView
): Pick<ReviewRow, "status" | "tone" | "whoHasIt" | "actionHref"> {
  const action = actionFor(item.reqCode)
  const satisfied = item.status === "satisfied"
  const rejected = item.status === "rejected"

  // The sponsoring company's packet is theirs to provide, not the applicant's —
  // status only, never an upload slot or a "Go" (there's nothing here for the
  // applicant to open). The file itself stays firewalled.
  if (item.sponsorManaged) {
    if (satisfied) return { status: "Received", tone: "ok", whoHasIt: "Your sponsor", actionHref: null }
    return { status: "Your sponsor is handling this", tone: "waiting", whoHasIt: "Your sponsor", actionHref: null }
  }

  if (action?.mode === "roster") {
    const isCohab = action.roster === "cohabitants"
    const prog = isCohab ? view.cohabitantProgress : view.referenceProgress
    const who = isCohab ? "Your household" : "Your references"
    if (satisfied || (prog && prog.notarizedCount >= prog.required)) {
      return { status: "Back and notarized", tone: "ok", whoHasIt: who, actionHref: null }
    }
    return {
      status: prog ? `${prog.notarizedCount} of ${prog.required} back` : "We'll invite them",
      tone: "progress",
      whoHasIt: who,
      actionHref: "/portal/people",
    }
  }

  if (action?.mode === "generate") {
    if (satisfied) return { status: "Signed", tone: "ok", whoHasIt: "Your concierge", actionHref: null }
    const draft = view.generated[item.reqCode]
    if (draft) {
      // Land on THIS item in Review & file, not the top of the section.
      return {
        status: "Prepared — needs your signature",
        tone: "todo",
        whoHasIt: "You",
        actionHref: `/portal/concierge#${item.reqCode}`,
      }
    }
    return { status: "We're preparing this", tone: "waiting", whoHasIt: "Your concierge", actionHref: null }
  }

  // obtain — a document the applicant gathers, so it has a vault card to land on.
  // Deep-link to THIS card (collapsed ID family → the photo-ID card).
  if (action?.mode === "obtain") {
    if (satisfied) return { status: "Approved", tone: "ok", whoHasIt: "Your concierge", actionHref: null }
    if (rejected) {
      return { status: "Needs a fix", tone: "todo", whoHasIt: "You", actionHref: `/portal/concierge#${vaultAnchor(item.reqCode)}` }
    }
    const cur = view.currentByReq[item.reqCode]
    if (cur) {
      // Covered by a document uploaded for another requirement (a passport that
      // also proves DOB + citizenship) — it's done, nothing to open or send again.
      if (cur.sharedFromName) {
        return { status: "Provided — covered by your ID", tone: "ok", whoHasIt: "You", actionHref: null }
      }
      return { status: "Received — we're checking it", tone: "progress", whoHasIt: "Your concierge", actionHref: null }
    }
    return { status: "We still need this from you", tone: "todo", whoHasIt: "You", actionHref: `/portal/concierge#${vaultAnchor(item.reqCode)}` }
  }

  // attest / system-verified / anything else — nothing for the applicant to open,
  // so no "Go" button (it would point at a section that doesn't exist).
  if (satisfied) return { status: "Done", tone: "ok", whoHasIt: "Your concierge", actionHref: null }
  return { status: "We're handling this", tone: "waiting", whoHasIt: "Your concierge", actionHref: null }
}

/**
 * Build the grouped review. `lastActivity` maps req_code → ISO timestamp (from
 * case_requirements.updated_at, resolved by the page). Empty groups are dropped.
 */
export function buildApplicationReview(
  view: RequirementView,
  lastActivity: Record<string, string>
): ReviewGroupData[] {
  const rows: ReviewRow[] = view.items
    .filter((i) => i.status !== "na")
    .map((i) => {
      const action = actionFor(i.reqCode)
      return {
        reqCode: i.reqCode,
        title: action?.customerTitle ?? i.title,
        lastActivity: lastActivity[i.reqCode] ?? null,
        ...derive(i, view),
      }
    })

  return REVIEW_GROUPS.map((g) => ({
    ...g,
    rows: rows.filter((r) => applicantGroup(r.reqCode) === g.key),
  })).filter((g) => g.rows.length > 0)
}
