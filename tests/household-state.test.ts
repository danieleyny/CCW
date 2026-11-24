import { describe, expect, it } from "vitest"
import { householdAnswersFromRoster } from "@/lib/cohabitants/household-state"

describe("household roster synchronization", () => {
  it("adds the operational household to intake without losing unrelated answers", () => {
    const answers = householdAnswersFromRoster(
      { dob: "1991-10-20", cohabitants: [] },
      [{ name: " Avery Chen ", relationship: " Spouse ", contact_email: " avery@example.com " }]
    )

    expect(answers).toMatchObject({
      dob: "1991-10-20",
      cohabitants: [{ name: "Avery Chen", relationship: "Spouse", email: "avery@example.com" }],
    })
  })

  it("returns to sole-occupancy mode when the roster becomes empty", () => {
    const answers = householdAnswersFromRoster(
      {
        dob: "1991-10-20",
        cohabitants: [{ name: "Avery Chen", relationship: "Spouse", email: "avery@example.com" }],
      },
      []
    )

    expect(answers.cohabitants).toEqual([])
    expect(answers.dob).toBe("1991-10-20")
  })
})

