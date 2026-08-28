/**
 * ROUND 2 — the Section B list drift guard. Four copies of the Section B question
 * numbers drifted once (Part 5 added "20a" to four and missed the disclosure-addendum
 * builder), so a sworn "yes" to Q20a rendered no explanation row. There is now ONE
 * exported constant; this test fails if any consumer redefines it or drops 20a.
 */
import { describe, expect, it } from "vitest"
import { SECTION_B_NUMBERS } from "@/lib/forms/section-b"
import { APPLICATION_COVERAGE } from "@/config/application-coverage"
import { FORM_TEMPLATES } from "@/lib/forms/templates"

describe("SECTION_B_NUMBERS — the single source", () => {
  it("has 20 questions and includes 20a", () => {
    expect(SECTION_B_NUMBERS).toHaveLength(20)
    expect(SECTION_B_NUMBERS).toContain("20a")
    // 20a sits between 20 and 21.
    expect(SECTION_B_NUMBERS.indexOf("20a")).toBe(SECTION_B_NUMBERS.indexOf("20") + 1)
  })

  it("every questionnaire-ref coverage field is a real Section B number, incl. 20a", () => {
    // The coverage map represents Q23–28 with dedicated captures (arrests, OOP, …),
    // so only Q10–22 + 20a are 'questionnaire'-ref. Assert none is a stray number and
    // 20a is among them — the drift that hid the Q20a bug.
    const coverageNos = APPLICATION_COVERAGE
      .filter((f) => f.capture.kind === "intake" && f.capture.ref === "questionnaire" && f.questionNo)
      .map((f) => f.questionNo!)
    expect(coverageNos).toContain("20a")
    for (const no of coverageNos) expect(SECTION_B_NUMBERS as readonly string[]).toContain(no)
  })

  it("the disclosure addendum produces a row for a Q20a 'yes' (the bug)", () => {
    const out = FORM_TEMPLATES.nypd_disclosure_addendum.build!({
      q20a: "yes",
      q20a_explain: "My business partner personally holds a licence.",
    })
    // Sequential slots: the single yes lands in row 1, whose number cell is "20a".
    expect(out.text?.q1).toBe("20a")
    expect(out.text?.q1exp).toContain("business partner")
  })
})
