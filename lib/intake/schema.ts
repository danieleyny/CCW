/**
 * V3-P0.6 — zod boundary for the intake wizard. Two layers:
 *
 *  1. `wizardAnswersSchema` — SHAPE validation. Every field optional (the wizard
 *     saves partial progress), but anything present must be the right type and
 *     within sane bounds. Unknown keys are stripped, so nothing unvalidated can
 *     reach the jsonb column.
 *
 *  2. `completionIssues()` — BUSINESS rules enforced when the applicant hits
 *     "Generate my requirements": DOB present, the 4-reference rule with valid
 *     emails, and complete arrest rows. (Disclosure narratives may still be
 *     finished at the review step — the submission guard, and later the CP-5
 *     QA gate, block filing until they exist.)
 *
 * No `server-only` so the wizard runs the same rules client-side for inline errors.
 */
import { z } from "zod"
import { ageFromDob, type WizardAnswers } from "./answers"

const short = z.string().max(200)
const narrative = z.string().max(8000)
const isoDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .or(z.literal(""))

const cohabitantSchema = z.object({
  name: short,
  relationship: z.string().max(100).optional(),
})
const arrestSchema = z.object({
  occurredOn: isoDay.optional(),
  jurisdiction: short.optional(),
  disposition: short.optional(),
  narrative: narrative.optional(),
})
const oopSchema = z.object({
  occurredOn: isoDay.optional(),
  jurisdiction: short.optional(),
  narrative: narrative.optional(),
})
const domesticSchema = z.object({
  occurredOn: isoDay.optional(),
  narrative: narrative.optional(),
})
const questionSchema = z.object({
  no: z.number().int().min(1).max(60),
  yes: z.boolean(),
  narrative: narrative.optional(),
})
const referenceSchema = z.object({
  name: short,
  email: z.string().max(320).optional(),
})
const socialSchema = z.object({
  platform: z.string().max(40),
  handle: z.string().max(200),
})

export const wizardAnswersSchema = z
  .object({
    // Step 1 — eligibility pre-screen
    dob: isoDay.optional(),
    residence: z.enum(["nyc", "non_resident"]).optional(),
    borough: z.string().max(40).optional(),
    prohibitorFelony: z.boolean().optional(),
    prohibitorMentalHealth: z.boolean().optional(),
    prohibitorActiveOop: z.boolean().optional(),
    prohibitorUnlawfulDrug: z.boolean().optional(),
    // Step 2 — identity & residence
    photoIdType: z.string().max(100).optional(),
    citizenship: z.enum(["citizen", "lpr"]).optional(),
    lprUnder7yr: z.boolean().optional(),
    residenceProof: z.string().max(100).optional(),
    // Step 3 — household & safeguard
    cohabitants: z.array(cohabitantSchema).max(20).optional(),
    safeguardName: short.optional(),
    // Step 4 — disclosures
    arrests: z.array(arrestSchema).max(50).optional(),
    ordersOfProtection: z.array(oopSchema).max(50).optional(),
    domesticIncidents: z.array(domesticSchema).max(50).optional(),
    questionnaire: z.array(questionSchema).max(40).optional(),
    // Step 5 — carry-specific & history
    trainingStatus: z.enum(["completed", "planned"]).optional(),
    trainingInstructor: short.optional(),
    trainingDate: isoDay.optional(),
    references: z.array(referenceSchema).max(10).optional(),
    socialAccounts: z.array(socialSchema).max(30).optional(),
    socialHandles: z.string().max(2000).optional(), // legacy free-text
    isVeteran: z.boolean().optional(),
    hasNameChange: z.boolean().optional(),
    hasOtherLicense: z.boolean().optional(),
  })
  .strip()

export type ParsedWizardAnswers = z.infer<typeof wizardAnswersSchema>

export const REQUIRED_REFERENCES = 4
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Step-5 rules: the 4-reference count, valid emails, training-date coherence. */
export function historyStepIssues(a: WizardAnswers): string[] {
  const issues: string[] = []

  // NYC carry + Special Carry both need 4 references (≥2 non-family — tracked
  // via the notarized-letter flow; the count is enforced here).
  const refs = (a.references ?? []).filter((r) => r.name?.trim())
  if (refs.length < REQUIRED_REFERENCES) {
    issues.push(`Four character references are required — you've listed ${refs.length}.`)
  }
  for (const r of refs) {
    if (!r.email?.trim() || !EMAIL_RE.test(r.email.trim())) {
      issues.push(`Reference "${r.name.trim()}" needs a valid email so we can send their letter link.`)
    }
  }

  // Training details only make sense when marked completed.
  if (a.trainingStatus === "completed" && !a.trainingDate) {
    issues.push("Add your training completion date, or set training to “not yet”.")
  }

  return issues
}

/** Step-4 rules: every disclosed arrest must be a complete row — candor-maximizing. */
export function disclosureStepIssues(a: WizardAnswers): string[] {
  const issues: string[] = []
  ;(a.arrests ?? []).forEach((ar, i) => {
    if (!ar.jurisdiction?.trim() || !ar.disposition?.trim()) {
      issues.push(`Arrest / summons #${i + 1} needs its court/jurisdiction and disposition.`)
    }
  })
  return issues
}

/** Step-1 rules (the hard under-21/prohibitor gate runs separately). */
export function eligibilityStepIssues(a: WizardAnswers): string[] {
  const issues: string[] = []
  if (!a.dob) issues.push("Enter your date of birth.")
  else if (ageFromDob(a.dob) < 21) issues.push("You must be at least 21 years old.")
  if (!a.residence) issues.push("Select your residence status.")
  return issues
}

/**
 * Business rules for "Generate my requirements". Returns human-readable issues;
 * empty array = good to generate. (Disclosure narratives may still be finished
 * at the review step — the submission guard blocks filing until they exist.)
 */
export function completionIssues(a: WizardAnswers): string[] {
  return [
    ...eligibilityStepIssues(a).map((m) => `${m} (step 1)`),
    ...disclosureStepIssues(a).map((m) => `${m} (step 4)`),
    ...historyStepIssues(a).map((m) => `${m} (step 5)`),
  ]
}
