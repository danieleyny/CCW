/**
 * The portal-entry worksheet, rendered FROM the coverage map
 * (config/application-coverage.ts) so it always mirrors the live field list and
 * reads in the application's own order.
 *
 * It reads the SAME assembled values the prepared PD 643-041 fills from
 * (buildApplicationValues → ApplicationValues: facts + intake + the canonical
 * Section B disclosure store) — one resolver, three consumers (the application, this
 * worksheet, the requirement generator). Reading raw WizardAnswers here was the
 * 9-of-123 bug in the sheet the applicant types from: a concierge case has an empty
 * wizard, so 25 of 35 rows printed "— not answered yet —" over real data.
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
import type { ApplicationValues } from "@/lib/forms/application"
import { ageFromDob } from "@/lib/intake/answers"
import { usDate, usMonthYear } from "@/lib/forms/format"

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

export function buildWorksheet(v: ApplicationValues, ctx: WorksheetContext): WorksheetSection[] {
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
      if (!fieldApplies(f, v)) continue
      const value = valueFor(f, v, ctx)
      if (value === null) continue // deliberately omitted from the worksheet
      rows.push({ label: f.formLabel, questionNo: f.questionNo, value })
    }

    if (rows.length) sections.push({ key: meta.key, label: meta.label, rows })
  }

  return sections
}

/** Only show business fields to a premises/business applicant, etc. */
function fieldApplies(f: CoverageField, v: ApplicationValues): boolean {
  if (!f.appliesTo || f.appliesTo.length === 0) return true
  const isPremises = v.licenseType === "Premises"
  const isSpecial = v.licenseType === "SpecialCarry"
  return f.appliesTo.some((t) => {
    if (t === "premises" || t === "business") return isPremises
    if (t === "special_carry") return isSpecial
    if (t === "carry") return v.licenseType !== "Premises"
    return false
  })
}

const s = (x: unknown): string => (typeof x === "string" ? x : x == null ? "" : String(x))

function valueFor(f: CoverageField, v: ApplicationValues, ctx: WorksheetContext): string | null {
  if (f.capture.kind === "at_filing") return AT_FILING

  switch (f.id) {
    case "license_type": {
      const lt = v.licenseType
      if (lt === "Premises") return "Premises"
      if (lt === "SpecialCarry") return "Carry (Special Handgun)"
      if (lt === "CarryGuardSecurity") return "Carry Guard / Security"
      if (lt === "LimitedCarry") return "Limited Carry"
      if (lt === "CarryBusiness") return "Carry Business"
      return lt ? String(lt) : NOT_ANSWERED
    }
    case "name_last_first":
      return joinNonEmpty([s(v.firstName), s(v.lastName)], " ") !== NOT_ANSWERED
        ? joinNonEmpty([s(v.lastName) && `${s(v.lastName)},`, s(v.firstName)], " ")
        : ctx.applicantName || NOT_ANSWERED
    case "middle_initial":
      return s(v.mi) || NOT_ANSWERED
    case "maiden_alias":
    case "q28_alias":
      return s(v.alias) || (v.q28 === "Yes" ? "Yes — see name-change document" : "None")
    case "legal_address":
      return joinNonEmpty([s(v.street), s(v.apt) && `Apt ${s(v.apt)}`, s(v.city), s(v.state), s(v.zip) || ctx.zip], ", ")
    case "citizenship":
      return v.citizenship === "Alien" ? "Lawful permanent resident" : v.citizenship === "Citizen" ? "U.S. citizen" : NOT_ANSWERED
    case "alien_registration_number":
      return s(v.alienReg) || NOT_ANSWERED
    case "contact_phone_email":
      return joinNonEmpty([s(v.cellPhone) || s(v.homePhone) || ctx.phone, s(v.email) || ctx.email], " · ")
    case "place_of_birth":
      return s(v.placeOfBirth) || NOT_ANSWERED
    case "date_of_birth":
      return usDate(s(v.dob)) || NOT_ANSWERED
    case "age":
      return s(v.age) || (s(v.dob) ? String(ageFromDob(s(v.dob))) : NOT_ANSWERED)
    case "physical_description":
      return joinNonEmpty(
        [
          s(v.height) && `Hgt ${s(v.height)}`,
          s(v.weight) && `Wgt ${s(v.weight)}`,
          s(v.sex) && `Sex ${s(v.sex)}`,
          s(v.hairColor) && `Hair ${s(v.hairColor)}`,
          s(v.eyeColor) && `Eyes ${s(v.eyeColor)}`,
        ],
        " · "
      )
    case "business_identity":
      return joinNonEmpty([s(v.businessName), s(v.businessType)], " · ")
    case "business_address":
      return joinNonEmpty([s(v.businessStreet), s(v.businessCity), s(v.businessState), s(v.businessZip)], ", ")
    case "business_occupation":
      return joinNonEmpty([s(v.occupation), s(v.busPhone)], " · ")
    case "out_of_city_license":
      return joinNonEmpty(
        [
          s(v.outOfCityLicenseNumber) && `No. ${s(v.outOfCityLicenseNumber)}`,
          s(v.outOfCityCounty) && `${s(v.outOfCityCounty)} County`,
          s(v.outOfCityIssuedOn) && `issued ${usDate(s(v.outOfCityIssuedOn))}`,
          s(v.outOfCityExpiresOn) && `expires ${usDate(s(v.outOfCityExpiresOn))}`,
        ],
        ", "
      )
    case "q23_arrests":
      return v.q23 === "Yes" ? "Yes — see the arrest statement(s) you prepared" : v.q23 === "No" ? "No" : NOT_ANSWERED
    case "q24_26_orders_of_protection": {
      const anyYes = v.q24 === "Yes" || v.q25 === "Yes" || v.q26 === "Yes"
      const anyAnswered = [v.q24, v.q25, v.q26].some((x) => x === "Yes" || x === "No")
      return anyYes ? "Yes — see the order-of-protection statement you prepared" : anyAnswered ? "No" : NOT_ANSWERED
    }
    case "q27_domestic_incident":
      return v.q27 === "Yes" ? "Yes — see the domestic-incident statement you prepared" : v.q27 === "No" ? "No" : NOT_ANSWERED
    case "residence_history":
      return renderHistory(
        asRows(v.residenceHistory).map((h) => joinNonEmpty([period(h.fromMonth, h.toMonth), h.address], " — "))
      )
    case "employment_history":
      return renderHistory(
        asRows(v.employmentHistory).map((h) =>
          joinNonEmpty([period(h.fromMonth, h.toMonth), h.employerName ?? h.employer, h.employerAddress, h.occupation], " — ")
        )
      )
    case "safeguard_method":
      return s(v.safeguardMethod) || NOT_ANSWERED
    case "safeguard_person":
      return joinNonEmpty([s(v.safeguardName), s(v.safeguardRelation), s(v.safeguardAddress), s(v.safeguardPhone)], " · ")
    default:
      break
  }

  // Section B 10–28 (incl. 20a) — read the resolved Yes/No from the disclosure store.
  if (f.capture.ref === "questionnaire" && f.questionNo) {
    const ans = v[`q${f.questionNo}`]
    if (ans === "Yes") return "YES — see explanation"
    if (ans === "No") return "No"
    return NOT_ANSWERED
  }

  return null
}

// ── small helpers ────────────────────────────────────────────────────────────
type HistoryRow = { fromMonth?: string; toMonth?: string; address?: string; employer?: string; employerName?: string; employerAddress?: string; occupation?: string }
function asRows(x: unknown): HistoryRow[] {
  return Array.isArray(x) ? (x as HistoryRow[]) : []
}
function joinNonEmpty(parts: Array<string | number | false | null | undefined>, sep: string): string {
  const kept = parts.filter((p): p is string | number => p !== false && p != null && String(p).trim() !== "")
  return kept.length ? kept.join(sep) : NOT_ANSWERED
}
function period(from?: string, to?: string): string {
  if (!from && !to) return ""
  return `${usMonthYear(from) || "?"} → ${usMonthYear(to) || "present"}`
}
function renderHistory(lines: string[]): string {
  const kept = lines.filter((l) => l && l !== NOT_ANSWERED)
  return kept.length ? kept.join("\n") : NOT_ANSWERED
}
