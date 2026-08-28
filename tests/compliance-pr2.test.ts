/**
 * PORTAL disclosures — the seventeen NYPD online-portal questions replace the old
 * paper Section B (10–28). Verifies the verbatim set, the traps (drugs split into
 * three, Q14 = protected person, Q6 conditional on Q5, Q16 leoOnly, Q17 a request),
 * and that the internal disclosure summary lists every question with its answer.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { renderRequirementDocument } from "@/lib/requirements/document-engine"
import { QUESTIONNAIRES } from "@/lib/requirements/questionnaires"
import { PORTAL_DISCLOSURES } from "@/lib/disclosures/portal-questions"
import { pdfText } from "./helpers/pdf"

describe("the portal disclosure question set", () => {
  it("is exactly seventeen questions, in order", () => {
    expect(PORTAL_DISCLOSURES).toHaveLength(17)
    expect(PORTAL_DISCLOSURES.map((q) => q.no)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17])
  })

  it("splits drugs into three separate questions (8, 9, 10)", () => {
    expect(PORTAL_DISCLOSURES[7].text).toMatch(/narcotics, controlled substances, or tranquilizers/)
    expect(PORTAL_DISCLOSURES[8].text).toMatch(/illegal drugs/)
    expect(PORTAL_DISCLOSURES[9].text).toMatch(/addicted/)
  })

  it("Q14 asks about the PROTECTED person, not orders issued by the applicant", () => {
    expect(PORTAL_DISCLOSURES[13].text).toMatch(/protected person on an Order of Protection/)
  })

  it("gates Q6 on Q5, marks Q16 leoOnly, and Q17 a confidentiality request", () => {
    expect(PORTAL_DISCLOSURES.find((q) => q.no === 6)?.conditionalOnYesOf).toBe(5)
    expect(PORTAL_DISCLOSURES.find((q) => q.no === 16)?.leoOnly).toBe(true)
    expect(PORTAL_DISCLOSURES.find((q) => q.no === 17)?.isConfidentialityRequest).toBe(true)
  })

  it("carries Q7's verbatim arrest note including the Certificate of Relief clause", () => {
    const q7 = PORTAL_DISCLOSURES.find((q) => q.no === 7)!
    expect(q7.note).toMatch(/dismissed, sealed, voided, or nullified/)
    expect(q7.note).toMatch(/Certificate of Relief from Disabilities/)
  })

  it("the disclosure questionnaire renders a top-level yes/no per asked question, Q6 nested under Q5, Q16 leoOnly", () => {
    const q = QUESTIONNAIRES["disclosure-addendum"]
    const top = new Set((q.fields ?? []).map((f) => f.name))
    // Every non-conditional question is top-level.
    for (const d of PORTAL_DISCLOSURES) {
      if (d.conditionalOnYesOf) expect(top.has(`q${d.no}`)).toBe(false) // Q6 nested
      else expect(top.has(`q${d.no}`), `no field for Q${d.no}`).toBe(true)
    }
    // Q6 is nested inside Q5's reveal; Q7 has the felony sub-question.
    const q5 = (q.fields ?? []).find((f) => f.name === "q5")!
    expect(q5.revealOnYes?.some((s) => s.name === "q6")).toBe(true)
    const q7 = (q.fields ?? []).find((f) => f.name === "q7")!
    expect(q7.revealOnYes?.some((s) => s.name === "q7_felony")).toBe(true)
    // Q16 is flagged leoOnly.
    expect((q.fields ?? []).find((f) => f.name === "q16")?.leoOnly).toBe(true)
  })
})

describe("the internal disclosure summary", () => {
  beforeAll(() => {
    process.env.PDF_FALLBACK_FONTS = "1"
  })
  afterAll(() => {
    delete process.env.PDF_FALLBACK_FONTS
  })

  it("lists every portal question with its answer", async () => {
    const answers = { q1: "no", q7: "yes", q7_explain: "Arrest in 2015, dismissed and sealed.", q13: "no" }
    const doc = await renderRequirementDocument({ reqCode: "DSC-01", applicantName: "Test Applicant", answers })
    const text = (await pdfText(doc.bytes)).toLowerCase()
    expect(text).toContain("1.")
    expect(text).toContain("7.")
    expect(text).toContain("dismissed and sealed")
    expect(text).toContain("not an nypd form")
    expect(doc.documentType).toBe("disclosure_summary")
  })
})
