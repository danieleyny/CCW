import { PORTAL_DISCLOSURES } from "@/lib/disclosures/portal-questions"
import { REQUIRED_UPLOAD_SLOTS } from "@/config/portal-steps"
import type { ApplicationValues } from "@/lib/forms/application"

/**
 * Portal readiness (PORTAL_ALIGNMENT_REBUILD Part 9), split into two gates:
 *  · ready-to-ENTER    — all the data is in, the disclosures are answered, and the
 *                        signed answers+authorization record is signed. Staff can
 *                        start transcribing into the portal.
 *  · ready-to-FINALIZE — additionally, every required portal upload is accepted and
 *                        the photograph passed. "Finalize and Pay" is irreversible, so
 *                        this gate must be honest.
 * Nothing here fills a form; it reports "you're ready" / "here's what's missing".
 */
export interface ReadinessItem {
  label: string
  href: string
}
export interface PortalReadiness {
  readyToEnter: boolean
  readyToFinalize: boolean
  enterMissing: ReadinessItem[]
  finalizeMissing: ReadinessItem[]
}

const DETAILS = "/portal/details"
const CHECKLIST = "/portal/checklist"

// The required uploads come from the ONE source of truth (config/portal-steps.ts —
// the starred step-13 slots). There is no second list here; that drift is exactly what
// portal-steps.ts exists to prevent.

export interface ReadinessRequirement {
  reqCode: string
  status: string // na | pending | satisfied | rejected
}

export function computePortalReadiness(
  v: ApplicationValues,
  disclosures: Record<string, unknown>,
  items: ReadinessRequirement[],
  opts: { licenseTrack?: string | null; signedRecordSatisfied: boolean } = { signedRecordSatisfied: false }
): PortalReadiness {
  const has = (k: string) => typeof v[k] === "string" && (v[k] as string).trim() !== ""
  const enterMissing: ReadinessItem[] = []
  const need = (ok: boolean, label: string, href: string) => {
    if (!ok) enterMissing.push({ label, href })
  }

  // Identity + address + physical.
  need(has("lastName") && has("firstName"), "Your legal name", DETAILS)
  need(has("dob"), "Date of birth", DETAILS)
  need(has("street") && has("city") && has("state") && has("zip"), "Home address", DETAILS)
  need(has("sex") && has("height") && has("weight") && has("hairColor") && has("eyeColor"), "Physical description", DETAILS)
  need(has("cellPhone") || has("homePhone"), "A phone number", DETAILS)
  need(has("email"), "Email address", DETAILS)
  // Histories.
  need(Array.isArray(v.residenceHistory) && v.residenceHistory.length > 0, "Five-year residence history", DETAILS)
  need(Array.isArray(v.employmentHistory) && v.employmentHistory.length > 0, "Five-year employment history", DETAILS)
  // Safekeeping + safeguard.
  need(has("safeguardMethod"), "How the handgun is secured", DETAILS)
  need(has("safeguardName") && (has("safeguardPhone") || has("safeguardEmail")), "The safeguard person", DETAILS)
  // 21+ is the portal's HARD rule for the safeguarding person. Both an unanswered
  // confirmation AND an explicit "No" block — an under-21 safeguard is disqualifying,
  // so it must be corrected before the portal will accept the entry.
  need(v.safeguardIs21 === "Yes", "Confirm the safeguard person is at least 21", DETAILS)

  // Disclosures — every asked question answered (Q6 only if Q5 yes; Q16 LEO only,
  // filtered out for non-LEO so absent is fine).
  const q5Yes = disclosures.q5 === "yes" || disclosures.q5 === true
  const answered = (x: unknown) => x === "yes" || x === "no" || x === true || x === false
  const disclosuresComplete = PORTAL_DISCLOSURES.every((q) => {
    if (q.leoOnly) return true // filtered for non-LEO; not required
    if (q.conditionalOnYesOf === 5 && !q5Yes) return true // not asked
    return answered(disclosures[`q${q.no}`])
  })
  need(disclosuresComplete, "Answer every disclosure question", CHECKLIST)

  // Letter of Necessity — a carry applicant supplies at least the "all"/"carry"
  // statements (lop3, lop4, lop6 in our numbering); premises does not carry.
  const isPremises = String(v.licenseType) === "Premises"
  if (!isPremises) need(has("lop3") && has("lop6"), "Letter of Necessity statements", CHECKLIST)

  // The signed answers + authorization record must be SIGNED.
  need(opts.signedRecordSatisfied, "Sign your answers + authorization", CHECKLIST)

  // Finalize gate: every STARRED portal upload slot accepted. Each slot may be filled
  // by one of a small set of requirements (COH-01 or COH-02) — the engine materialises
  // exactly one per case, so we check the materialised ones and skip a slot that isn't
  // on this case at all.
  const finalizeMissing: ReadinessItem[] = []
  for (const slot of REQUIRED_UPLOAD_SLOTS) {
    const slotItems = slot.reqCodes
      .map((code) => items.find((i) => i.reqCode === code))
      .filter((i): i is ReadinessRequirement => !!i && i.status !== "na")
    if (slotItems.length === 0) continue // not applicable to this case
    if (!slotItems.some((i) => i.status === "satisfied")) {
      finalizeMissing.push({ label: slot.portalLabel, href: CHECKLIST })
    }
  }

  const readyToEnter = enterMissing.length === 0
  return {
    readyToEnter,
    // Can't finalize until you can enter, and every required upload is accepted.
    readyToFinalize: readyToEnter && finalizeMissing.length === 0,
    enterMissing,
    finalizeMissing,
  }
}
