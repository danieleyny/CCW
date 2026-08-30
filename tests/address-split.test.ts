import { describe, expect, it } from "vitest"
import { splitStreet } from "@/lib/forms/format"
import { buildApplicationValues } from "@/lib/forms/application"
import { buildPortalWorksheet } from "@/lib/disclosures/worksheet-portal"
import type { WizardAnswers } from "@/lib/intake/answers"

// Part D — the applicant no longer confirms a building/street split. Staff see the
// split, derived at render time with splitStreet(); nobody audits our parser.

describe("splitStreet — the render-time heuristic", () => {
  it("splits a leading building number", () => {
    expect(splitStreet("55 Water Street")).toEqual({ buildingNumber: "55", streetName: "Water Street" })
  })
  it("keeps an alphanumeric building number together", () => {
    expect(splitStreet("12A Broadway")).toEqual({ buildingNumber: "12A", streetName: "Broadway" })
  })
  it("leaves a number-less line as street only", () => {
    expect(splitStreet("Broadway")).toEqual({ buildingNumber: "", streetName: "Broadway" })
  })
})

describe("worksheet — home + residence address split at render", () => {
  it("home address is split from the single street line", () => {
    const w = buildPortalWorksheet(buildApplicationValues({ "applicant.address.street": "742 Evergreen Terrace" }, {} as WizardAnswers, {}), {}, {})
    const verify = w.find((s) => s.title === "Verify Your Information")!
    expect(verify.fields.find((f) => f.label === "Home Address — Building Number")?.value).toBe("742")
    expect(verify.fields.find((f) => f.label === "Home Address — Street Name")?.value).toBe("Evergreen Terrace")
  })
  it("each residence row is split from its address line", () => {
    const intake = { residenceHistory: [{ address: "10 Downing St", city: "Bronx", state: "NY", zip: "10451" }] } as WizardAnswers
    const w = buildPortalWorksheet(buildApplicationValues({}, intake, {}), {}, {})
    const res = w.find((s) => s.title === "Residence History (past 5 years)")!
    expect(res.fields.find((f) => f.label === "Row 1 — Building Number")?.value).toBe("10")
    expect(res.fields.find((f) => f.label === "Row 1 — Street Name")?.value).toBe("Downing St")
  })
})
