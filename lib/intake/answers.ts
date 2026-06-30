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
  // Step 3 — household & safeguard
  cohabitants?: CohabitantEntry[]
  safeguardName?: string
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
  hasNameChange?: boolean
  hasOtherLicense?: boolean
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

/** The Q10–28 "mirror" — a representative subset; every yes binds a narrative. */
export const QUESTIONNAIRE: { no: number; text: string }[] = [
  { no: 10, text: "Have you ever been arrested, indicted, or convicted of a crime or offense (in any jurisdiction), even if sealed or dismissed?" },
  { no: 12, text: "Have you ever had a firearms license or permit revoked, suspended, or denied?" },
  { no: 14, text: "Are you now, or have you ever been, the subject of an order of protection or a restraining order?" },
  { no: 16, text: "Have you ever been a party to a domestic-incident report?" },
  { no: 18, text: "Have you ever been confined or treated for a mental illness, or adjudicated mentally incompetent?" },
  { no: 20, text: "Have you ever been discharged from the military under other-than-honorable conditions?" },
  { no: 22, text: "Do you use, or have you unlawfully used, a controlled substance?" },
  { no: 24, text: "Have you ever been terminated from employment for cause involving violence, theft, or dishonesty?" },
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

/** Map wizard answers into the requirements generator's answer shape. */
export function toGeneratorAnswers(a: WizardAnswers): GeneratorAnswers {
  return {
    isCarry: true,
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
