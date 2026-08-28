import type { ApplicationValues } from "@/lib/forms/application"

/**
 * Readiness of a prepared PD 643-041 draft: which of the fields WE fill are still
 * empty, so the applicant is never handed a sparse form that looks finished (the
 * "9 of 123" problem). Each missing item names the NYPD question and links to the
 * screen that collects it. The SSN and the handgun list are deliberately NOT counted
 * (entered at filing). Section B is counted as one item ("N of 20 answered").
 *
 * Pure — takes the assembled ApplicationValues (from buildApplicationValues) so it
 * resolves from exactly the same facts/intake/disclosures the fill uses.
 */
export interface ReadinessItem {
  label: string
  /** The screen that collects it. */
  href: string
}
export interface ApplicationReadiness {
  ready: boolean
  captured: number
  total: number
  missing: ReadinessItem[]
}

const DETAILS = "/portal/details"
const DISCLOSURES = "/portal/checklist" // the disclosure questionnaire lives on the checklist

const SECTION_B_NUMBERS = [
  "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22",
  "23", "24", "25", "26", "27", "28",
]

export function computeApplicationReadiness(
  v: ApplicationValues,
  opts: { licenseTrack?: string | null } = {}
): ApplicationReadiness {
  const has = (k: string) => {
    const val = v[k]
    return typeof val === "string" && val.trim() !== ""
  }
  const isPremises = String(v.licenseType) === "Premises"
  const missing: ReadinessItem[] = []
  let total = 0
  let captured = 0
  const check = (ok: boolean, label: string, href: string) => {
    total++
    if (ok) captured++
    else missing.push({ label, href })
  }

  // Identity + address (Your details)
  check(has("lastName") && has("firstName"), "Your legal name", DETAILS)
  check(has("dob"), "Date of birth", DETAILS)
  check(has("placeOfBirth"), "Place of birth", DETAILS)
  check(has("street") && has("city") && has("zip"), "Home address", DETAILS)
  check(has("citizenship"), "Citizenship", DETAILS)
  // Contact — at least a cell or home phone, and an email
  check(has("cellPhone") || has("homePhone"), "A phone number", DETAILS)
  check(has("email"), "Email address", DETAILS)
  // Physical description (Q4)
  check(has("height") && has("weight") && has("sex") && has("hairColor") && has("eyeColor"), "Physical description (height, weight, sex, hair, eyes)", DETAILS)
  // Licence type
  check(has("licenseType"), "Licence type", DETAILS)
  // Employer (skip for a premises-residence applicant with no employer need)
  if (!isPremises) check(has("businessName") || has("occupation"), "Employment / business", DETAILS)

  // Q29 five-year histories (Application history section on Your details)
  const resCount = Array.isArray(v.residenceHistory) ? v.residenceHistory.length : 0
  const empCount = Array.isArray(v.employmentHistory) ? v.employmentHistory.length : 0
  check(resCount > 0, "Five-year residence history (Q29)", DETAILS)
  check(empCount > 0, "Five-year employment history (Q29)", DETAILS)

  // Q30/Q31 safeguard
  check(has("safeguardMethod"), "How/where the handgun is safeguarded (Q30)", DETAILS)
  check(has("safeguardName"), "Who will safeguard it (Q31)", DETAILS)

  // Section B — how many of the 20 questions are answered
  total++
  const answered = SECTION_B_NUMBERS.filter((n) => has(`q${n}`)).length
  if (answered >= SECTION_B_NUMBERS.length) captured++
  else missing.push({ label: `Section B disclosures — ${answered} of ${SECTION_B_NUMBERS.length} questions answered (Q10–28)`, href: DISCLOSURES })

  return { ready: missing.length === 0, captured, total, missing }
}
