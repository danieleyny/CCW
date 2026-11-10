import { describe, expect, it } from "vitest"
import {
  applicationTypeFromLegacy,
  applicationTypeNeedsCarryTraining,
  applicationTypeToGeneratorAnswers,
} from "@/lib/application-types"
import { historyStepIssues, requiredReferences } from "@/lib/intake/schema"

describe("application type foundation", () => {
  it("never reinterprets historical premises-business answers as a home licence", () => {
    expect(applicationTypeFromLegacy({ licenseType: "premises" })).toBe("premise_business")
    expect(applicationTypeFromLegacy({ licenseType: "premise_residence" })).toBe("premise_residence")
  })

  it("gives Premise Residence two references and no carry training requirement", () => {
    expect(requiredReferences({}, { applicationType: "premise_residence" })).toBe(2)
    expect(applicationTypeNeedsCarryTraining("premise_residence")).toBe(false)
    expect(
      historyStepIssues(
        { trainingStatus: "completed" },
        { applicationType: "premise_residence" }
      )
    ).toEqual([])
  })

  it("keeps the carry training validation and carry registry flags", () => {
    expect(applicationTypeNeedsCarryTraining("concealed_carry")).toBe(true)
    expect(applicationTypeNeedsCarryTraining(null)).toBe(true)
    expect(
      historyStepIssues(
        { trainingStatus: "completed" },
        { applicationType: "concealed_carry" }
      )
    ).toContain("Add your training completion date, or set training to “not yet”.")
    expect(applicationTypeToGeneratorAnswers("concealed_carry").isCarry).toBe(true)
  })

  it("marks Premise Business separately from Premise Residence", () => {
    expect(applicationTypeToGeneratorAnswers("premise_business")).toMatchObject({
      isCarry: false,
      isPremises: true,
      isPremiseResidence: false,
      isPremisesBusiness: true,
    })
  })
})
