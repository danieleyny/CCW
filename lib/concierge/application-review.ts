import { actionFor } from "@/lib/requirements/actions"
import { sectionFor, SECTIONS, SECTION_BY_KEY, SECTION_ORDER, type SectionKey } from "@/lib/requirements/sections"
import type { RequirementView } from "@/lib/portal/requirement-view"

/**
 * The read-only "Your application" surface. A concierge applicant paid NOT to work
 * an upload list, so /portal/documents shows the WHOLE application, grouped by the
 * ONE registry taxonomy (lib/requirements/sections) — the same sections the vault
 * uses — with WHO HAS IT and a last-activity stamp that proves motion between
 * logins. Nothing is actionable in place; a genuinely-theirs item links back into
 * the vault, disclosures, or Review & file.
 */

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
  key: SectionKey
  label: string
  blurb: string
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
 * Build the grouped review, using the ONE registry taxonomy. `lastActivity` maps
 * req_code → ISO timestamp (case_requirements.updated_at). `sponsorName` names the
 * sponsor section ("From ISS Action") for this case. Hidden (admin) + empty groups
 * are dropped; sections render in the fixed registry order.
 */
export function buildApplicationReview(
  view: RequirementView,
  lastActivity: Record<string, string>,
  sponsorName?: string | null
): ReviewGroupData[] {
  const rows = view.items
    .filter((i) => i.status !== "na")
    .map((i) => {
      const action = actionFor(i.reqCode)
      return {
        reqCode: i.reqCode,
        section: sectionFor(i.reqCode) ?? "conditional",
        title: action?.customerTitle ?? i.title,
        lastActivity: lastActivity[i.reqCode] ?? null,
        ...derive(i, view),
      }
    })

  return SECTIONS.filter((s) => !s.hidden)
    .map((s) => {
      const isSponsor = s.key === "sponsor"
      const company = sponsorName?.trim() || "your sponsor"
      return {
        key: s.key,
        label: isSponsor ? `From ${company}` : SECTION_BY_KEY[s.key].title,
        blurb: s.blurb.replace("{company}", company),
        rows: rows.filter((r) => r.section === s.key),
      }
    })
    .filter((g) => g.rows.length > 0)
    .sort((a, b) => SECTION_ORDER[a.key] - SECTION_ORDER[b.key])
}
