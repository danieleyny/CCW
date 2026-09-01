import { describe, expect, it } from "vitest"
import { PORTAL_STEPS, PORTAL_UPLOAD_SLOTS, REQUIRED_UPLOAD_CODES, questionStepNo } from "@/config/portal-steps"
import { buildApplicationValues } from "@/lib/forms/application"
import { buildPortalWorksheet } from "@/lib/disclosures/worksheet-portal"
import type { WizardAnswers } from "@/lib/intake/answers"

describe("portal-steps — the single source of truth", () => {
  it("has 17 steps, numbered 1..17 in order", () => {
    expect(PORTAL_STEPS.map((s) => s.no)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17])
  })
  it("the three question steps cover disclosure questions 1..16 with no gap or overlap", () => {
    const covered = new Set<number>()
    for (const s of PORTAL_STEPS) {
      if (s.kind !== "questions" || !s.range) continue
      for (let n = s.range[0]; n <= s.range[1]; n++) covered.add(n)
    }
    expect([...covered].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
    expect(questionStepNo(6)).toBe(8)
    expect(questionStepNo(7)).toBe(9)
    expect(questionStepNo(16)).toBe(10)
  })
  it("upload slots have unique zip bases and required = starred", () => {
    const bases = PORTAL_UPLOAD_SLOTS.map((s) => s.zipBase)
    expect(new Set(bases).size).toBe(bases.length)
    expect(REQUIRED_UPLOAD_CODES).toEqual(PORTAL_UPLOAD_SLOTS.filter((s) => s.starred).map((s) => s.reqCode))
  })
})

describe("worksheet derives its order and headings from PORTAL_STEPS", () => {
  const w = buildPortalWorksheet(buildApplicationValues({}, {} as WizardAnswers, {}), {}, {})
  it("emits exactly the 17 steps, in order, with the portal's verbatim titles", () => {
    expect(w.map((s) => s.no)).toEqual(PORTAL_STEPS.map((s) => s.no))
    expect(w.map((s) => s.title)).toEqual(PORTAL_STEPS.map((s) => s.title))
  })
  it("uploads (13) and checkpoints (15/16/17) carry a note, not fields", () => {
    const uploads = w.find((s) => s.no === 13)!
    expect(uploads.kind).toBe("uploads")
    expect(uploads.fields).toHaveLength(0)
    expect(uploads.note).toBeTruthy()
    for (const no of [15, 16, 17]) {
      const c = w.find((s) => s.no === no)!
      expect(c.kind).toBe("checkpoint")
      expect(c.note).toBeTruthy()
    }
  })
})

describe("the fake-N/A bug is fixed: an inapplicable question is a real not-applicable state", () => {
  it("Q6 (dishonorable discharge) with Q5≠Yes is notApplicable, greyed, NOT a typed \"N/A\", NOT missing", () => {
    // Q5 answered "no" → Q6 is not asked.
    const w = buildPortalWorksheet(buildApplicationValues({}, {} as WizardAnswers, {}), { q5: "no" }, {})
    const step8 = w.find((s) => s.no === 8)!
    const q6 = step8.fields.find((f) => f.label.startsWith("6."))!
    expect(q6.notApplicable).toBe(true)
    expect(q6.missing).toBe(false)
    expect(q6.value).not.toBe("N/A")
    expect(q6.value.toLowerCase()).toContain("not applicable")
  })
  it("Q16 (LEO-only) for a non-LEO applicant is notApplicable, not missing", () => {
    const w = buildPortalWorksheet(buildApplicationValues({}, {} as WizardAnswers, {}), {}, { leo: false })
    const step10 = w.find((s) => s.no === 10)!
    const q16 = step10.fields.find((f) => f.label.startsWith("16."))!
    expect(q16.notApplicable).toBe(true)
    expect(q16.missing).toBe(false)
  })
  it("a real Yes/No answer always wins over not-applicable", () => {
    // Even though Q5≠Yes, if Q6 somehow has an explicit answer, show it.
    const w = buildPortalWorksheet(buildApplicationValues({}, {} as WizardAnswers, {}), { q5: "no", q6: "no" }, {})
    const q6 = w.find((s) => s.no === 8)!.fields.find((f) => f.label.startsWith("6."))!
    expect(q6.notApplicable).toBeFalsy()
    expect(q6.value).toBe("No")
  })
})
