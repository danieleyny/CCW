/**
 * Intake wizard answer model + the deterministic mapping into the requirements
 * generator's answer shape. This is the "minimum truthful answer set" the
 * architecture's Section 04 describes; it drives both eligibility gating and
 * conditional requirement/disclosure generation.
 */
import type { IntakeAnswers as GeneratorAnswers } from "@/lib/requirements/generate"

export interface CohabitantEntry {
  name: string
  relationship?: string
}
export interface ArrestEntry {
  occurredOn?: string
  jurisdiction?: string
  disposition?: string
  narrative?: string
}
export interface OopEntry {
  occurredOn?: string
  jurisdiction?: string
  narrative?: string
}
export interface DomesticEntry {
  occurredOn?: string
  narrative?: string
}
export interface QuestionAnswer {
  no: number
  yes: boolean
  narrative?: string
}
export interface ReferenceEntry {
  name: string
  email?: string
}
export interface SocialAccount {
  platform: string
  handle: string
}

/** Q29 — one row of the five-year residence history. */
export interface AddressHistoryEntry {
  fromMonth?: string // YYYY-MM
  toMonth?: string // YYYY-MM, or blank for "present"
  address?: string // street, city, state, county, zip, apt
}
/** Q29 — one row of the five-year employment history. */
export interface EmploymentHistoryEntry {
  fromMonth?: string
  toMonth?: string
  employer?: string // business name + address
  occupation?: string
}

/** Platforms offered in the social-media disclosure dropdown. */
export const SOCIAL_PLATFORMS = [
  "Instagram",
  "Facebook",
  "X (Twitter)",
  "TikTok",
  "YouTube",
  "LinkedIn",
  "Snapchat",
  "Reddit",
  "Other",
] as const

export interface WizardAnswers {
  // Step 1 — eligibility pre-screen (hard gate)
  dob?: string
  residence?: "nyc" | "non_resident"
  licenseType?: "carry" | "premises" // default carry
  borough?: string
  prohibitorFelony?: boolean
  prohibitorMentalHealth?: boolean
  prohibitorActiveOop?: boolean
  prohibitorUnlawfulDrug?: boolean
  // Step 2 — identity & residence
  photoIdType?: string
  citizenship?: "citizen" | "lpr"
  lprUnder7yr?: boolean
  residenceProof?: string
  // Step 2 — full Section-A identity (Phase 2 field coverage, PD 643-041 §1–4)
  middleInitial?: string
  aliasName?: string // maiden name / alias (form field 1 + Q28)
  legalStreet?: string
  legalApt?: string
  legalCity?: string
  legalState?: string // default "NY"
  alienRegistrationNumber?: string // non-citizens only
  placeOfBirth?: string // "City, State, Country"
  heightInches?: number
  weightLbs?: number
  sex?: string
  hairColor?: string
  eyeColor?: string
  // Employment / business the licence is for (form fields 5–8)
  businessName?: string
  businessType?: string
  businessStreet?: string
  businessCity?: string
  businessState?: string
  businessZip?: string
  businessPhone?: string
  occupation?: string
  // Out-of-city licence (Special Carry — form field 9)
  outOfCityLicenseNumber?: string
  outOfCityIssuedBy?: string
  outOfCityCounty?: string
  outOfCityIssuedOn?: string
  outOfCityExpiresOn?: string
  // Step 3 — household & safeguard
  cohabitants?: CohabitantEntry[]
  safeguardName?: string
  // Q30–31 — safeguarding method + the designated safeguard person
  safeguardMethod?: string
  safeguardAddress?: string
  safeguardRelation?: string
  safeguardPhone?: string
  // Step 4 — disclosure interview
  arrests?: ArrestEntry[]
  ordersOfProtection?: OopEntry[]
  domesticIncidents?: DomesticEntry[]
  questionnaire?: QuestionAnswer[]
  // Step 5 — carry-specific & history
  trainingStatus?: "completed" | "planned"
  trainingInstructor?: string
  trainingDate?: string
  references?: ReferenceEntry[]
  socialAccounts?: SocialAccount[]
  socialHandles?: string // legacy free-text, kept for older sessions
  isVeteran?: boolean
  isRetiredLeo?: boolean
  hasNameChange?: boolean
  hasOtherLicense?: boolean
  // Q29 — five-year residence + employment histories
  residenceHistory?: AddressHistoryEntry[]
  employmentHistory?: EmploymentHistoryEntry[]
}

/** One readable line per account for the social-media disclosure PDF. */
export function formatSocialAccounts(a: WizardAnswers): string {
  const rows = (a.socialAccounts ?? []).filter((s) => s.handle?.trim())
  if (rows.length) return rows.map((s) => `${s.platform}: ${s.handle.trim()}`).join("\n")
  return a.socialHandles ?? ""
}

export const INTAKE_STEPS = [
  { n: 1, key: "eligibility", label: "Eligibility" },
  { n: 2, key: "identity", label: "Identity & residence" },
  { n: 3, key: "household", label: "Household & safeguard" },
  { n: 4, key: "disclosure", label: "Disclosures" },
  { n: 5, key: "history", label: "Carry & history" },
  { n: 6, key: "review", label: "Review & generate" },
] as const

/**
 * The Section-B questionnaire — the yes/no + explain block, quoted from
 * PD 643-041 (Rev. 11-10) verbatim. Every "yes" binds a narrative.
 *
 * These are the questions NOT already handled by a dedicated disclosure flow:
 * Q23 (arrests) → `arrests`, Q24–26 (orders of protection) → `ordersOfProtection`,
 * Q27 (domestic incident) → `domesticIncidents`, Q28 (alias) → `aliasName`. The
 * coverage map (config/application-coverage.ts) is the source of truth for which
 * question maps where.
 *
 * Q20a is folded into Q20's text (the form asks the same thing about the
 * applicant's own corporate roles and about any officer/director/partner).
 */
export const QUESTIONNAIRE: { no: number; text: string }[] = [
  { no: 10, text: "Had or ever applied for a Handgun License issued by any Licensing Authority in N.Y.S.?" },
  { no: 11, text: "Been discharged from any employment?" },
  { no: 12, text: "Used narcotics or tranquilizers? (List doctor's name, address, telephone number in your explanation.)" },
  { no: 13, text: "Been subpoenaed to, or testified at, a hearing or inquiry conducted by any executive, legislative or judicial body?" },
  { no: 14, text: "Been denied appointment in a civil service system — Federal, State, or Local?" },
  { no: 15, text: "Served in the armed forces of this or any other country?" },
  { no: 16, text: "Received a discharge other than honorable?" },
  { no: 17, text: "Been rejected for military service?" },
  { no: 18, text: "Are you presently engaged in any other employment, business or profession where a need for a firearm exists?" },
  { no: 19, text: "Had or applied for any type of license or permit issued to you by any City, State or Federal agency?" },
  { no: 20, text: "Has any corporation or partnership of which you are an officer, director, or partner — or any officer, director or partner — ever applied for or been issued a license or permit by the Police Department? (Give type, year, license number.)" },
  { no: 21, text: "Suffered from mental illness, or due to mental illness received treatment, been admitted to a hospital or institution, or taken medication? (List doctors/institutions, name, address, phone.)" },
  { no: 22, text: "Have you ever suffered from any disability or condition that may affect your ability to safely possess or use a handgun? (Epilepsy, Diabetes, Fainting Spells, Blackouts, Temporary Loss of Memory or any Nervous Disorder must be listed.)" },
]

export function ageFromDob(dob: string): number {
  const d = new Date(dob)
  const now = new Date("2026-06-27T00:00:00Z") // anchored "today" for deterministic gating
  let age = now.getUTCFullYear() - d.getUTCFullYear()
  const m = now.getUTCMonth() - d.getUTCMonth()
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age--
  return age
}

export interface EligibilityResult {
  blocked: boolean
  reasons: string[]
  jurisdiction: "nyc" | "special_carry"
}

/** Hard eligibility gate: under-21 or any prohibitor → attorney-review track. */
export function eligibilityGate(a: WizardAnswers): EligibilityResult {
  const reasons: string[] = []
  if (a.dob && ageFromDob(a.dob) < 21) reasons.push("Applicant must be at least 21 years old.")
  if (a.prohibitorFelony) reasons.push("A felony or serious-offense conviction is a statutory disqualifier.")
  if (a.prohibitorMentalHealth) reasons.push("A disqualifying mental-health adjudication is present.")
  if (a.prohibitorActiveOop) reasons.push("An active order of protection bars licensure.")
  if (a.prohibitorUnlawfulDrug) reasons.push("Current unlawful drug use is a disqualifier.")
  return {
    blocked: reasons.length > 0,
    reasons,
    jurisdiction: a.residence === "non_resident" ? "special_carry" : "nyc",
  }
}

/**
 * Map wizard answers into the requirements generator's answer shape.
 * `isRenewal` comes from the CASE (cases.is_renewal), not the wizard — the
 * caller passes it in.
 */
export function toGeneratorAnswers(
  a: WizardAnswers,
  opts: { isRenewal?: boolean } = {}
): GeneratorAnswers {
  const premises = a.licenseType === "premises"
  return {
    isCarry: !premises,
    isPremises: premises,
    isRenewal: !!opts.isRenewal,
    isRetiredLeo: !!a.isRetiredLeo,
    hasCohabitants: (a.cohabitants?.length ?? 0) > 0,
    hasArrestHistory: (a.arrests?.length ?? 0) > 0,
    hasOopHistory: (a.ordersOfProtection?.length ?? 0) > 0,
    hasDomesticIncident: (a.domesticIncidents?.length ?? 0) > 0,
    lprUnder7yr: a.citizenship === "lpr" && !!a.lprUnder7yr,
    isVeteran: !!a.isVeteran,
    hasNameChange: !!a.hasNameChange,
    anyQuestionYes: (a.questionnaire ?? []).some((q) => q.yes),
  }
}
