import { describe, expect, it } from "vitest"
import {
  wizardAnswersSchema,
  completionIssues,
  requiredReferences,
  historyStepIssues,
} from "@/lib/intake/schema"

const fourRefs = [
  { name: "A", email: "a@x.co" },
  { name: "B", email: "b@x.co" },
  { name: "C", email: "c@x.co" },
  { name: "D", email: "d@x.co" },
]

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
    const short = completionIssues({ dob: "1990-01-01", residence: "nyc", references: fourRefs.slice(0, 2) })
    expect(short.some((i) => i.toLowerCase().includes("character references"))).toBe(false)
    expect(short).toHaveLength(0)
    // Zero references is fine too.
    expect(completionIssues({ dob: "1990-01-01", residence: "nyc", references: [] })).toHaveLength(0)
    // A name-only reference (no email yet) doesn't block either.
    expect(
      completionIssues({ dob: "1990-01-01", residence: "nyc", references: [{ name: "A" }] })
    ).toHaveLength(0)
  })

  it("still catches a reference email that was typed but malformed", () => {
    const badEmail = completionIssues({
      dob: "1990-01-01",
      residence: "nyc",
      references: [{ name: "A", email: "not-an-email" }],
    })
    expect(badEmail.some((i) => i.includes("invalid email"))).toBe(true)
  })

  it("a complete carry answer set passes", () => {
    expect(completionIssues({ dob: "1990-01-01", residence: "nyc", references: fourRefs })).toHaveLength(0)
  })

  it("incomplete arrest rows block (candor-maximizing)", () => {
    const issues = completionIssues({
      dob: "1990-01-01",
      residence: "nyc",
      references: fourRefs,
      arrests: [{ occurredOn: "2014-01-01" }],
    })
    expect(issues.some((i) => i.includes("jurisdiction and disposition"))).toBe(true)
  })

  it("training marked completed requires its date", () => {
    const issues = historyStepIssues({ references: fourRefs, trainingStatus: "completed" })
    expect(issues.some((i) => i.includes("completion date"))).toBe(true)
  })
})
