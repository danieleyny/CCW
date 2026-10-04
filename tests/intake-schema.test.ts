import { describe, expect, it } from "vitest"
import {
  wizardAnswersSchema,
  completionIssues,
  requiredReferences,
  historyStepIssues,
  eligibilityStepIssues,
} from "@/lib/intake/schema"

const fourRefs = [
  { name: "A", email: "a@x.co" },
  { name: "B", email: "b@x.co" },
  { name: "C", email: "c@x.co" },
  { name: "D", email: "d@x.co" },
]

const portalNoAnswers = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((no) => ({ no, yes: false }))
const complete = (extra: Record<string, unknown> = {}) => ({
  dob: "1990-01-01",
  residence: "nyc" as const,
  questionnaireVersion: "nypd_portal_v1" as const,
  questionnaire: portalNoAnswers,
  ...extra,
})

describe("wizardAnswersSchema — the jsonb boundary", () => {
  it("rejects wrong-typed fields", () => {
    expect(wizardAnswersSchema.safeParse({ dob: 12345 }).success).toBe(false)
    expect(wizardAnswersSchema.safeParse({ residence: "mars" }).success).toBe(false)
  })
  it("strips unknown keys before they reach the DB", () => {
    const out = wizardAnswersSchema.parse({ dob: "1990-01-01", evil: "payload" } as never)
    expect("evil" in out).toBe(false)
  })
  it("accepts a full valid answer set", () => {
    expect(
      wizardAnswersSchema.safeParse({
        dob: "1990-01-01",
        residence: "nyc",
        licenseType: "carry",
        references: fourRefs,
        socialAccounts: [{ platform: "Instagram", handle: "@x" }],
        legalZip: "11201",
        residenceHistory: [{ address: "1 Main St", apt: "2A", city: "Brooklyn", state: "NY", zip: "11201", country: "United States" }],
        employmentHistory: [{ employerName: "Acme", employerAddress: "2 Main St", city: "Queens", state: "NY", zip: "11101" }],
        firearms: [{ make: "Glock", model: "19", licensed: "Yes", licenseNumber: "ABC" }],
        otherLicenses: [{ number: "N-1", agency: "Nassau County", stateCounty: "NY / Nassau" }],
        homeCountyPistolLicense: "yes",
        nycAssignment: true,
        otherPistolLicense: true,
        isRetiredLeo: true,
      }).success
    ).toBe(true)
  })
})

describe("track-aware reference counts (38 RCNY §5-03/§5-05)", () => {
  it("4 carry / 2 premises / 0 renewal", () => {
    expect(requiredReferences({}, {})).toBe(4)
    expect(requiredReferences({ licenseType: "premises" }, {})).toBe(2)
    expect(requiredReferences({}, { isRenewal: true })).toBe(0)
    expect(requiredReferences({ licenseType: "premises" }, { isRenewal: true })).toBe(0)
  })

  it("renewals skip reference validation entirely", () => {
    expect(historyStepIssues({ references: [] }, { isRenewal: true })).toHaveLength(0)
  })

  it("references are OPTIONAL at intake — an incomplete count never blocks", () => {
    // Fewer than the needed count must NOT block finishing intake.
    const short = completionIssues(complete({ references: fourRefs.slice(0, 2) }))
    expect(short.some((i) => i.toLowerCase().includes("character references"))).toBe(false)
    expect(short).toHaveLength(0)
    // Zero references is fine too.
    expect(completionIssues(complete({ references: [] }))).toHaveLength(0)
    // A name-only reference (no email yet) doesn't block either.
    expect(
      completionIssues(complete({ references: [{ name: "A" }] }))
    ).toHaveLength(0)
  })

  it("still catches a reference email that was typed but malformed", () => {
    const badEmail = completionIssues(complete({
      references: [{ name: "A", email: "not-an-email" }],
    }))
    expect(badEmail.some((i) => i.includes("invalid email"))).toBe(true)
  })

  it("a complete carry answer set passes", () => {
    expect(completionIssues(complete({ references: fourRefs }))).toHaveLength(0)
  })

  it("incomplete arrest rows block (candor-maximizing)", () => {
    const issues = completionIssues(complete({
      references: fourRefs,
      arrests: [{ occurredOn: "2014-01-01" }],
    }))
    expect(issues.some((i) => i.includes("jurisdiction and disposition"))).toBe(true)
  })

  it("requires explicit answers to every applicable live portal question", () => {
    const issues = completionIssues({ dob: "1990-01-01", residence: "nyc" })
    expect(issues.some((i) => i.includes("missing Q1"))).toBe(true)
  })

  it("requires a narrative for Yes but never treats legacy paper answers as portal answers", () => {
    const yesWithoutNarrative = complete({
      questionnaire: portalNoAnswers.map((q) => (q.no === 7 ? { ...q, yes: true } : q)),
    })
    expect(completionIssues(yesWithoutNarrative).some((i) => i.includes("Q7 is Yes"))).toBe(true)

    expect(
      completionIssues({
        dob: "1990-01-01",
        residence: "nyc",
        questionnaire: [{ no: 10, yes: false }],
      }).some((i) => i.includes("missing Q1"))
    ).toBe(true)
  })

  it("training marked completed requires its date", () => {
    const issues = historyStepIssues({ references: fourRefs, trainingStatus: "completed" })
    expect(issues.some((i) => i.includes("completion date"))).toBe(true)
  })
})

describe("Special Carry intent routing", () => {
  const special = { dob: "1990-01-01", residence: "non_resident" as const }

  it("requires a civilian Special Carry applicant to choose personal or armed-assignment use", () => {
    expect(eligibilityStepIssues(special).some((i) => i.includes("personal protection"))).toBe(true)
    expect(eligibilityStepIssues({ ...special, nycCarryIntent: "personal" })).toEqual([])
  })

  it("does not ask a sponsored guard case to re-select the derived licence category", () => {
    expect(eligibilityStepIssues(special, { licenseTrack: "sponsored_unresolved" })).toEqual([])
    expect(eligibilityStepIssues(special, { licenseTrack: "special_carry_guard" })).toEqual([])
  })
})
