/**
 * The portal-entry worksheet, rendered FROM the coverage map
 * (config/application-coverage.ts) so it always mirrors the live field list and
 * reads in the application's own order. Replaces the old generator that dumped
 * raw `key: value` pairs and skipped every non-string value.
 *
 * We prepare; the applicant files. This sheet is a copy-and-paste aid for the
 * Section A/B FIELDS the applicant types into licensing.nypdonline.org — not the
 * supporting documents (those get the upload guide) and not the handgun list
 * (an original applicant leaves it blank).
 *
 * ⚠️ `at_filing` fields print a labelled blank, never a value — SSN and the
 * social-security card are deliberately not stored (see DATA_INVENTORY.md).
 */
import {
  APPLICATION_COVERAGE,
  COVERAGE_SECTIONS,
  type CoverageField,
} from "@/config/application-coverage"
import type { WizardAnswers } from "@/lib/intake/answers"
import { QUESTIONNAIRE, ageFromDob } from "@/lib/intake/answers"

export interface WorksheetContext {
  applicantName: string
  phone?: string | null
  email?: string | null
  zip?: string | null
}

export interface WorksheetRow {
  label: string
  questionNo?: string
  /** The value to type in, an at-filing placeholder, or a multi-line block. */
  value: string
}
export interface WorksheetSection {
  key: string
  label: string
  rows: WorksheetRow[]
}

const AT_FILING = "— enter this yourself at filing —"
const NOT_ANSWERED = "— not answered yet —"

/** Sections that belong on the copy-paste worksheet (fields, not documents). */
const WORKSHEET_SECTIONS = new Set(["type", "identity", "employment", "out_of_city", "questions", "history", "safeguard"])

export function buildWorksheet(a: WizardAnswers, ctx: WorksheetContext): WorksheetSection[] {
  const sections: WorksheetSection[] = []

  // `as const satisfies` narrows the array to a literal union; widen to the
  // interface so members without a questionNo don't break element access.
  const all: readonly CoverageField[] = APPLICATION_COVERAGE
  for (const meta of COVERAGE_SECTIONS) {
    if (!WORKSHEET_SECTIONS.has(meta.key)) continue
    const fields = all.filter((f) => f.section === meta.key)
    const rows: WorksheetRow[] = []

    for (const f of fields) {
      // Track-scoped fields only appear when they apply.
      if (!fieldApplies(f, a)) continue
      const value = valueFor(f, a, ctx)
      if (value === null) continue // deliberately omitted from the worksheet
      rows.push({ label: f.formLabel, questionNo: f.questionNo, value })
    }

    if (rows.length) sections.push({ key: meta.key, label: meta.label, rows })
  }

  return sections
}

/** Only show business fields to a premises/business applicant, etc. */
function fieldApplies(f: CoverageField, a: WizardAnswers): boolean {
  if (!f.appliesTo || f.appliesTo.length === 0) return true
  const isPremises = a.licenseType === "premises"
  const isSpecial = a.residence === "non_resident"
  return f.appliesTo.some((t) => {
    if (t === "premises" || t === "business") return isPremises
    if (t === "special_carry") return isSpecial
    if (t === "carry") return a.licenseType !== "premises"
    return false
  })
}

function valueFor(f: CoverageField, a: WizardAnswers, ctx: WorksheetContext): string | null {
  if (f.capture.kind === "at_filing") return AT_FILING

  switch (f.id) {
    case "license_type":
      return `${a.licenseType === "premises" ? "Premises" : "Carry"}${a.residence === "non_resident" ? " (Special Carry)" : ""}`
    case "other_nyc_handgun_license":
      return a.hasOtherLicense ? "Yes — enter the type and license number at filing" : "No"
    case "name_last_first":
      return ctx.applicantName || NOT_ANSWERED
    case "middle_initial":
      return a.middleInitial || NOT_ANSWERED
    case "maiden_alias":
    case "q28_alias":
      return a.aliasName || (a.hasNameChange ? "Yes — see name-change document" : "None")
    case "legal_address":
      return joinNonEmpty([a.legalStreet, a.legalApt && `Apt ${a.legalApt}`, a.legalCity, a.legalState, ctx.zip], ", ")
    case "citizenship":
      return a.citizenship === "lpr" ? "Lawful permanent resident" : a.citizenship === "citizen" ? "U.S. citizen" : NOT_ANSWERED
    case "alien_registration_number":
      return a.alienRegistrationNumber || NOT_ANSWERED
    case "contact_phone_email":
      return joinNonEmpty([ctx.phone, ctx.email], " · ")
    case "place_of_birth":
      return a.placeOfBirth || NOT_ANSWERED
    case "date_of_birth":
      return a.dob || NOT_ANSWERED
    case "age":
      return a.dob ? String(ageFromDob(a.dob)) : NOT_ANSWERED
    case "physical_description":
      return joinNonEmpty(
        [
          a.heightInches != null && `Hgt ${a.heightInches} in`,
          a.weightLbs != null && `Wgt ${a.weightLbs} lb`,
          a.sex && `Sex ${a.sex}`,
          a.hairColor && `Hair ${a.hairColor}`,
          a.eyeColor && `Eyes ${a.eyeColor}`,
        ],
        " · "
      )
    case "business_identity":
      return joinNonEmpty([a.businessName, a.businessType], " · ")
    case "business_address":
      return joinNonEmpty([a.businessStreet, a.businessCity, a.businessState, a.businessZip], ", ")
    case "business_occupation":
      return joinNonEmpty([a.occupation, a.businessPhone], " · ")
    case "out_of_city_license":
      return joinNonEmpty(
        [
          a.outOfCityLicenseNumber && `No. ${a.outOfCityLicenseNumber}`,
          a.outOfCityIssuedBy && `by ${a.outOfCityIssuedBy}`,
          a.outOfCityCounty && `${a.outOfCityCounty} County`,
          a.outOfCityIssuedOn && `issued ${a.outOfCityIssuedOn}`,
          a.outOfCityExpiresOn && `expires ${a.outOfCityExpiresOn}`,
        ],
        ", "
      )
    case "q23_arrests":
      return summarizeYes((a.arrests ?? []).length, "arrest/summons — see the arrest statements you prepared")
    case "q24_26_orders_of_protection":
      return summarizeYes((a.ordersOfProtection ?? []).length, "order(s) of protection — see the statement you prepared")
    case "q27_domestic_incident":
      return summarizeYes((a.domesticIncidents ?? []).length, "domestic-incident report — see the statement you prepared")
    case "residence_history":
      return renderHistory(
        (a.residenceHistory ?? []).map((h) => joinNonEmpty([period(h.fromMonth, h.toMonth), h.address], " — "))
      )
    case "employment_history":
      return renderHistory(
        (a.employmentHistory ?? []).map((h) =>
          joinNonEmpty([period(h.fromMonth, h.toMonth), h.employer, h.occupation], " — ")
        )
      )
    case "safeguard_method":
      return a.safeguardMethod || NOT_ANSWERED
    case "safeguard_person":
      return joinNonEmpty([a.safeguardName, a.safeguardRelation, a.safeguardAddress, a.safeguardPhone], " · ")
    default:
      break
  }

  // Q20a is folded into Q20 in the interview — don't print a duplicate row.
  if (f.id === "q20a") return null

  // The Q10–22 questionnaire, keyed by the shared questionnaire answer set.
  if (f.capture.ref === "questionnaire" && f.questionNo) {
    const no = parseInt(f.questionNo, 10)
    const ans = (a.questionnaire ?? []).find((x) => x.no === no)
    const q = QUESTIONNAIRE.find((x) => x.no === no)
    if (!q) return null
    if (!ans) return NOT_ANSWERED
    return ans.yes ? `YES${ans.narrative ? ` — ${ans.narrative}` : " — see explanation"}` : "No"
  }

  return null
}

// ── small helpers ────────────────────────────────────────────────────────────
function joinNonEmpty(parts: Array<string | number | false | null | undefined>, sep: string): string {
  const kept = parts.filter((p): p is string | number => p !== false && p != null && String(p).trim() !== "")
  return kept.length ? kept.join(sep) : NOT_ANSWERED
}
function summarizeYes(n: number, label: string): string {
  return n > 0 ? `Yes — ${n} ${label}` : "No"
}
function period(from?: string, to?: string): string {
  if (!from && !to) return ""
  return `${from || "?"} → ${to || "present"}`
}
function renderHistory(lines: string[]): string {
  const kept = lines.filter((l) => l && l !== NOT_ANSWERED)
  return kept.length ? kept.join("\n") : NOT_ANSWERED
}
