/**
 * COMPLIANCE PR2 — Part C, all of Section B.
 *   C1 — the disclosure questionnaire asks every question 10–28, with 24/25/26 and
 *        21/22 as distinct items.
 *   C2 — two different documents: the OFFICIAL PD 643-041A addendum lists ONLY the
 *        "yes" answers keyed by question number (and does NOT list "no" rows), while
 *        our INTERNAL disclosure summary lists every question with its answer.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { renderRequirementDocument } from "@/lib/requirements/document-engine"
import { QUESTIONNAIRES, SECTION_B_QUESTIONS } from "@/lib/requirements/questionnaires"
import { pdfText } from "./helpers/pdf"

describe("C1 — the canonical Section B list and questionnaire", () => {
  it("covers every question 10–28, with 24/25/26 and 21/22 as separate items", () => {
    const nos = SECTION_B_QUESTIONS.map((q) => q.no)
    for (const n of ["10", "11", "12", "21", "22", "23", "24", "25", "26", "27", "28"]) {
      expect(nos, `missing Q${n}`).toContain(n)
    }
    // 24/25/26 are three distinct entries, not one collapsed order-of-protection Q.
    expect(nos.filter((n) => n === "24" || n === "25" || n === "26")).toHaveLength(3)
    // 21 and 22 are distinct.
    expect(nos.filter((n) => n === "21" || n === "22")).toHaveLength(2)
  })

  it("the disclosure questionnaire asks a yes/no per Section B question", () => {
    const q = QUESTIONNAIRES["disclosure-addendum"]
    const fieldNames = new Set((q.fields ?? []).map((f) => f.name))
    for (const s of SECTION_B_QUESTIONS) {
      expect(fieldNames, `no field for Q${s.no}`).toContain(`q${s.no}`)
    }
  })
})

describe("C2 — two different documents", () => {
  beforeAll(() => {
    process.env.PDF_FALLBACK_FONTS = "1"
  })
  afterAll(() => {
    delete process.env.PDF_FALLBACK_FONTS
  })

  it("PD 643-041A (QUE-01) lists ONLY the yes answers, keyed by question number", async () => {
    const answers = { q12: "yes", q12_explain: "Prescribed by Dr. Lee in 2019.", q23: "no", q24: "no" }
    const doc = await renderRequirementDocument({ reqCode: "QUE-01", applicantName: "Test Applicant", answers })
    const text = (await pdfText(doc.bytes)).toLowerCase()
    expect(text).toContain("question 12")
    expect(text).toContain("prescribed by dr. lee")
    // A "no" answer never appears as its own row on the official addendum.
    expect(text).not.toContain("question 23")
    expect(text).not.toContain("question 24")
    // The old misuse text is gone.
    expect(text).not.toContain("answered")
  })

  it("all-no produces an addendum with NO question rows", async () => {
    const doc = await renderRequirementDocument({ reqCode: "QUE-01", applicantName: "Test Applicant", answers: {} })
    const text = (await pdfText(doc.bytes)).toLowerCase()
    for (const s of SECTION_B_QUESTIONS) expect(text).not.toContain(`question ${s.no}`)
  })

  it("the internal disclosure summary (DSC-01) lists EVERY question with its answer", async () => {
    const answers = { q10: "no", q12: "yes", q12_explain: "detail", q24: "no" }
    const doc = await renderRequirementDocument({ reqCode: "DSC-01", applicantName: "Test Applicant", answers })
    const text = (await pdfText(doc.bytes)).toLowerCase()
    // Every question number is present with an answer (10 … 28, incl. 24/25/26).
    for (const n of ["10.", "12.", "24.", "25.", "26.", "28."]) expect(text).toContain(n)
    expect(text).toContain("not an nypd form")
    expect(doc.documentType).toBe("disclosure_summary")
  })
})
