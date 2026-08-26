/**
 * THE fact registry — one catalogue of every reusable fact about the people on a
 * case. A questionnaire field or a form map references a fact by KEY; the resolver
 * (lib/facts/resolve) returns the canonical value. No fact is defined twice under
 * two names.
 *
 * `from` extracts the value from the intake/clients/sponsors records — used to
 * backfill case_facts and as a fallback before a fact has its own row. `derive`
 * computes a read-only value from other facts (a full name, a split date). SSN is
 * registered but NEVER lives in case_facts — it is handled by lib/facts/ssn.
 */
import type { WizardAnswers } from "@/lib/intake/answers"

export type FactType = "text" | "date" | "phone" | "zip" | "select"
export type FactGroup = "you" | "address" | "contact" | "physical" | "employer" | "sponsor" | "safeguard"

export interface FactSource {
  intake: WizardAnswers
  client: { fullName: string; email: string | null; phone: string | null; borough: string | null; zip: string | null }
  sponsor: {
    legalName: string | null
    agencyLicenseNumber: string | null
    agencyLicenseExpiry: string | null
    custodianName: string | null
    custodianLicenseNumber: string | null
    businessStreet: string | null
    businessCity: string | null
    businessState: string | null
    businessZip: string | null
    businessPhone: string | null
    businessType: string | null
  } | null
}

export interface FactDef {
  key: string
  label: string
  type: FactType
  group: FactGroup
  sensitive?: boolean
  /** Sponsor-owned facts (the agency licence, custodian) are the sponsor's to set. */
  owner?: "applicant" | "sponsor"
  /** Backfill / fallback source. */
  from?: (s: FactSource) => string | null | undefined
  /** Read-only value computed from other facts at resolve time. */
  derive?: (get: (k: string) => string) => string
}

// The legal name is NEVER inferred from a display name or an email address
// (3F). clients.full_name can carry whatever was set at sign-up — including an
// email — so a value that looks email-like yields no name at all. The real legal
// name comes from case_facts, confirmed against an identity document / the
// applicant; until then legalFirstName/legalLastName resolve empty and the
// completeness gate + the details screen show them as still-needed.
const looksLikeEmail = (v: string) => /\S+@\S+\.\S+/.test(v) || v.includes("@")
const nameParts = (full: string) => (looksLikeEmail(full) ? [] : full.trim().split(/\s+/).filter(Boolean))

export const FACTS: FactDef[] = [
  // ── You ──
  { key: "applicant.legalFirstName", label: "First name", type: "text", group: "you", from: (s) => nameParts(s.client.fullName)[0] },
  { key: "applicant.legalMiddleInitial", label: "Middle initial", type: "text", group: "you", from: (s) => s.intake.middleInitial },
  { key: "applicant.legalLastName", label: "Last name", type: "text", group: "you", from: (s) => { const p = nameParts(s.client.fullName); return p.length > 1 ? p[p.length - 1] : "" } },
  { key: "applicant.aliasOrMaidenName", label: "Alias / maiden name", type: "text", group: "you", from: (s) => s.intake.aliasName },
  { key: "applicant.dob", label: "Date of birth", type: "date", group: "you", sensitive: true, from: (s) => s.intake.dob },
  { key: "applicant.placeOfBirth", label: "Place of birth", type: "text", group: "you", from: (s) => s.intake.placeOfBirth },
  { key: "applicant.sex", label: "Sex", type: "text", group: "physical", from: (s) => s.intake.sex },
  { key: "applicant.height", label: "Height", type: "text", group: "physical", from: (s) => (s.intake.heightInches ? String(s.intake.heightInches) : "") },
  { key: "applicant.weight", label: "Weight (lb)", type: "text", group: "physical", from: (s) => (s.intake.weightLbs ? String(s.intake.weightLbs) : "") },
  { key: "applicant.hairColor", label: "Hair color", type: "text", group: "physical", from: (s) => s.intake.hairColor },
  { key: "applicant.eyeColor", label: "Eye color", type: "text", group: "physical", from: (s) => s.intake.eyeColor },
  { key: "applicant.citizenship", label: "Citizenship", type: "text", group: "you", from: (s) => s.intake.citizenship },
  { key: "applicant.alienRegistrationNumber", label: "Alien registration #", type: "text", group: "you", from: (s) => s.intake.alienRegistrationNumber },

  // ── Address ──
  { key: "applicant.address.street", label: "Street address", type: "text", group: "address", from: (s) => s.intake.legalStreet },
  { key: "applicant.address.apt", label: "Apt #", type: "text", group: "address", from: (s) => s.intake.legalApt },
  { key: "applicant.address.city", label: "City", type: "text", group: "address", from: (s) => s.intake.legalCity },
  { key: "applicant.address.state", label: "State", type: "text", group: "address", from: (s) => s.intake.legalState ?? "NY" },
  { key: "applicant.address.zip", label: "ZIP", type: "zip", group: "address", from: (s) => s.client.zip },

  // ── Contact ──
  { key: "applicant.phone.home", label: "Home phone", type: "phone", group: "contact" },
  { key: "applicant.phone.cell", label: "Cell phone", type: "phone", group: "contact", from: (s) => s.client.phone },
  { key: "applicant.phone.work", label: "Work phone", type: "phone", group: "contact" },
  { key: "applicant.email", label: "Email", type: "text", group: "contact", from: (s) => s.client.email },

  // ── Employer (the applicant's own, unless a sponsorship supplies it) ──
  // Employer facts resolve SPONSOR-FIRST when a sponsorship exists (the employer
  // IS the sponsoring company), then fall back to the applicant's intake. Uniform
  // across all employer.* so `employer.name` is no longer the odd one out.
  { key: "employer.name", label: "Employer name", type: "text", group: "employer", from: (s) => s.sponsor?.legalName ?? s.intake.businessName },
  { key: "employer.address.street", label: "Employer street", type: "text", group: "employer", from: (s) => s.sponsor?.businessStreet ?? s.intake.businessStreet },
  { key: "employer.address.city", label: "Employer city", type: "text", group: "employer", from: (s) => s.sponsor?.businessCity ?? s.intake.businessCity },
  { key: "employer.address.state", label: "Employer state", type: "text", group: "employer", from: (s) => s.sponsor?.businessState ?? s.intake.businessState },
  { key: "employer.address.zip", label: "Employer ZIP", type: "zip", group: "employer", from: (s) => s.sponsor?.businessZip ?? s.intake.businessZip },
  { key: "employer.phone", label: "Employer phone", type: "phone", group: "employer", from: (s) => s.sponsor?.businessPhone ?? s.intake.businessPhone },
  { key: "employer.type", label: "Type of business", type: "text", group: "employer", from: (s) => s.sponsor?.businessType ?? s.intake.businessType },
  { key: "applicant.jobTitle", label: "Job title", type: "text", group: "employer", from: (s) => s.intake.occupation },

  // ── Sponsor-owned ──
  { key: "sponsor.legalName", label: "Company legal name", type: "text", group: "sponsor", owner: "sponsor", from: (s) => s.sponsor?.legalName },
  { key: "sponsor.agencyLicenseNumber", label: "Agency licence #", type: "text", group: "sponsor", owner: "sponsor", from: (s) => s.sponsor?.agencyLicenseNumber },
  { key: "sponsor.agencyLicenseExpiry", label: "Agency licence expiry", type: "date", group: "sponsor", owner: "sponsor", from: (s) => s.sponsor?.agencyLicenseExpiry },
  { key: "sponsor.custodianName", label: "Gun custodian", type: "text", group: "sponsor", owner: "sponsor", from: (s) => s.sponsor?.custodianName },
  { key: "sponsor.custodianLicenseNumber", label: "Custodian licence #", type: "text", group: "sponsor", owner: "sponsor", from: (s) => s.sponsor?.custodianLicenseNumber },

  // ── SSN — registered, but NEVER stored in case_facts (see lib/facts/ssn) ──
  { key: "applicant.ssn", label: "Social Security number", type: "text", group: "you", sensitive: true },

  // ── Derived (read-only) ──
  { key: "applicant.fullName", label: "Full name", type: "text", group: "you", derive: (g) => [g("applicant.legalFirstName"), g("applicant.legalMiddleInitial"), g("applicant.legalLastName")].filter(Boolean).join(" ") },
  { key: "applicant.fullAddress", label: "Full address", type: "text", group: "address", derive: (g) => {
    const line1 = [g("applicant.address.street"), g("applicant.address.apt")].filter(Boolean).join(" Apt ")
    return [line1, g("applicant.address.city"), [g("applicant.address.state"), g("applicant.address.zip")].filter(Boolean).join(" ")].filter(Boolean).join(", ")
  } },
  { key: "applicant.age", label: "Age", type: "text", group: "you", derive: (g) => {
    const dob = g("applicant.dob")
    if (!dob) return ""
    const d = new Date(dob)
    if (Number.isNaN(d.getTime())) return ""
    const now = new Date(2026, 7, 24) // stamped; scripts can't call new Date() but app resolve overrides
    let age = now.getFullYear() - d.getFullYear()
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--
    return String(age)
  } },
  { key: "applicant.dob.mm", label: "DOB month", type: "text", group: "you", derive: (g) => (g("applicant.dob").split("-")[1] ?? "") },
  { key: "applicant.dob.dd", label: "DOB day", type: "text", group: "you", derive: (g) => (g("applicant.dob").split("-")[2] ?? "") },
  { key: "applicant.dob.yyyy", label: "DOB year", type: "text", group: "you", derive: (g) => (g("applicant.dob").split("-")[0] ?? "") },
]

export const FACT_BY_KEY: Record<string, FactDef> = Object.fromEntries(FACTS.map((f) => [f.key, f]))

export function factDef(key: string): FactDef | null {
  return FACT_BY_KEY[key] ?? null
}

/** The non-derived, non-SSN facts a person actually enters — for backfill + the details screen. */
export const EDITABLE_FACTS = FACTS.filter((f) => !f.derive && f.key !== "applicant.ssn")
