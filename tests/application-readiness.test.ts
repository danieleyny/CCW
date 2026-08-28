/**
 * FIX D — the readiness gate. computeApplicationReadiness reports which PD 643-041
 * sections are still empty (never counting SSN / the handgun list), and
 * stampIncompleteDraft turns a partial fill into an unmistakably-unfinished PDF.
 */
import { describe, expect, it } from "vitest"
import { buildApplicationValues } from "@/lib/forms/application"
import { computeApplicationReadiness } from "@/lib/forms/application-readiness"
import { stampIncompleteDraft } from "@/lib/forms/partial"
import { fillTemplate } from "@/lib/forms/fill"
import { PDFDocument } from "pdf-lib"
import type { WizardAnswers } from "@/lib/intake/answers"

// A fully-answered concealed-carry case.
const completeFacts: Record<string, string> = {
  "applicant.legalLastName": "Powell",
  "applicant.legalFirstName": "Marcus",
  "applicant.dob": "1990-04-02",
  "applicant.placeOfBirth": "Brooklyn, NY",
  "applicant.address.street": "1 Main St",
  "applicant.address.city": "New York",
  "applicant.address.zip": "10001",
  "applicant.citizenship": "citizen",
  "applicant.phone.cell": "212-555-0100",
  "applicant.email": "m@example.com",
  "applicant.height": "5'10\"",
  "applicant.weight": "180",
  "applicant.sex": "M",
  "applicant.hairColor": "Brown",
  "applicant.eyeColor": "Brown",
  "employer.name": "Test Guard Co.",
  "safeguard.method": "Locked safe at my residence",
  "safeguard.name": "Dana Reyes",
}
const completeIntake = {
  licenseType: "carry",
  residenceHistory: [{ fromMonth: "2018-06", address: "1 Main St" }],
  employmentHistory: [{ fromMonth: "2019-01", employer: "Test Guard Co." }],
} as WizardAnswers
const allDisclosures = Object.fromEntries(
  ["10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28"].map((n) => [`q${n}`, "no"])
)

describe("computeApplicationReadiness", () => {
  it("a fully-answered case is ready with nothing missing", () => {
    const v = buildApplicationValues(completeFacts, completeIntake, { licenseTrack: "concealed_carry", disclosures: allDisclosures })
    const r = computeApplicationReadiness(v, { licenseTrack: "concealed_carry" })
    expect(r.ready).toBe(true)
    expect(r.missing).toHaveLength(0)
    expect(r.captured).toBe(r.total)
  })

  it("an empty case is not ready and names the missing sections with links", () => {
    const v = buildApplicationValues({}, {} as WizardAnswers, {})
    const r = computeApplicationReadiness(v, {})
    expect(r.ready).toBe(false)
    expect(r.missing.length).toBeGreaterThan(5)
    // Every missing item links somewhere the applicant can act.
    for (const m of r.missing) expect(m.href).toMatch(/^\/portal\//)
    // The safeguard + history fields (the concierge-invisible ones) are flagged.
    expect(r.missing.some((m) => /safeguard/i.test(m.label))).toBe(true)
    expect(r.missing.some((m) => /residence history/i.test(m.label))).toBe(true)
  })

  it("counts Section B as one item and reports partial progress", () => {
    const v = buildApplicationValues(completeFacts, completeIntake, {
      licenseTrack: "concealed_carry",
      disclosures: { q10: "no", q11: "no" }, // only 2 of 19 answered
    })
    const r = computeApplicationReadiness(v, { licenseTrack: "concealed_carry" })
    const sectionB = r.missing.find((m) => /Section B/i.test(m.label))
    expect(sectionB).toBeDefined()
    expect(sectionB!.label).toMatch(/2 of 19/)
  })
})

describe("stampIncompleteDraft", () => {
  it("prepends a cover page and preserves the filled pages", async () => {
    const v = buildApplicationValues(completeFacts, completeIntake, { licenseTrack: "concealed_carry", disclosures: { q10: "no" } })
    const filled = await fillTemplate("nypd_handgun_application", v)
    const before = (await PDFDocument.load(filled.bytes)).getPageCount()
    const r = computeApplicationReadiness(v, { licenseTrack: "concealed_carry" })
    const stamped = await stampIncompleteDraft(filled.bytes, r.missing)
    const after = (await PDFDocument.load(stamped)).getPageCount()
    expect(after).toBe(before + 1) // exactly one cover sheet (few missing items)
  })
})
