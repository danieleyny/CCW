import { describe, expect, it } from "vitest"
import {
  applicationTypeToGeneratorAnswers,
  type ApplicantSelectableApplicationType,
} from "@/lib/application-types"
import { requirementApplies } from "@/lib/requirements/generate"
import { retireOtherJurisdictionRequirements } from "@/lib/requirements/materialize"
import { requiredReferences } from "@/lib/intake/schema"

const paths: ApplicantSelectableApplicationType[] = [
  "concealed_carry",
  "premise_residence",
  "special_carry",
]

describe("license path alignment", () => {
  it.each(paths)("generates the correct requirement branches for %s", (path) => {
    const answers = applicationTypeToGeneratorAnswers(path)

    expect(requirementApplies("carry_not_renewal", answers)).toBe(path !== "premise_residence")
    expect(requirementApplies("two_refs_not_renewal", answers)).toBe(path === "premise_residence")
    expect(requirementApplies("premise_residence_only", answers)).toBe(path === "premise_residence")
    expect(requirementApplies("unless_special_carry", answers)).toBe(path !== "special_carry")
  })

  it.each([
    ["concealed_carry", 4],
    ["premise_residence", 2],
    ["special_carry", 4],
  ] as const)("requires the right number of references for %s", (path, expected) => {
    expect(requiredReferences({}, { applicationType: path })).toBe(expected)
  })

  it("retires only open applicant requirements from the prior jurisdiction", async () => {
    const updated: string[][] = []
    const rows = [
      { id: "old-pending", status: "pending", requirement: { jurisdiction_id: "old", party: "applicant" } },
      { id: "old-na", status: "na", requirement: { jurisdiction_id: "old", party: "applicant" } },
      { id: "old-done", status: "satisfied", requirement: { jurisdiction_id: "old", party: "applicant" } },
      { id: "target", status: "pending", requirement: { jurisdiction_id: "target", party: "applicant" } },
      { id: "sponsor", status: "pending", requirement: { jurisdiction_id: "old", party: "sponsor" } },
    ]
    const admin = {
      from(table: string) {
        if (table === "jurisdiction_profiles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { id: "target" }, error: null }),
              }),
            }),
          }
        }
        return {
          select: () => ({
            eq: async () => ({ data: rows, error: null }),
          }),
          update: () => ({
            in: async (_column: string, ids: string[]) => {
              updated.push(ids)
              return { error: null }
            },
          }),
        }
      },
    } as never

    await expect(retireOtherJurisdictionRequirements(admin, "case-1", "nyc")).resolves.toBe(2)
    expect(updated).toEqual([["old-pending", "old-na"]])
  })
})
