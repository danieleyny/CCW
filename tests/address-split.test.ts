import { describe, expect, it } from "vitest"
import { resolveStreetSplit, splitStreet } from "@/lib/forms/format"
import { buildApplicationValues } from "@/lib/forms/application"
import { buildPortalWorksheet } from "@/lib/disclosures/worksheet-portal"
import type { WizardAnswers } from "@/lib/intake/answers"

describe("resolveStreetSplit — confirmed split wins, else parse", () => {
  it("falls back to the render-time parse until confirmed", () => {
    expect(resolveStreetSplit({ buildingNumber: "999", streetName: "Wrong Ave", confirmed: false, street: "123 Main St" }))
      .toEqual({ buildingNumber: "123", streetName: "Main St" })
  })
  it("uses the stored split once confirmed", () => {
    expect(resolveStreetSplit({ buildingNumber: "12A", streetName: "Broadway", confirmed: true, street: "unparseable line" }))
      .toEqual({ buildingNumber: "12A", streetName: "Broadway" })
  })
})

describe("buildApplicationValues — building/street split gated on confirmation", () => {
  const base = {
    "applicant.address.street": "123 Main St",
    "applicant.address.buildingNumber": "500",
    "applicant.address.streetName": "Confirmed Blvd",
  }
  it("does NOT surface an unconfirmed split", () => {
    const v = buildApplicationValues(base, {} as WizardAnswers, {})
    expect(v.homeBuildingNumber).toBe("")
    expect(v.homeStreetName).toBe("")
  })
  it("surfaces the split once streetConfirmed=yes", () => {
    const v = buildApplicationValues({ ...base, "applicant.address.streetConfirmed": "yes" }, {} as WizardAnswers, {})
    expect(v.homeBuildingNumber).toBe("500")
    expect(v.homeStreetName).toBe("Confirmed Blvd")
  })
})

describe("portal worksheet — home address prefers a confirmed split", () => {
  function homeFields(facts: Record<string, string>) {
    const v = buildApplicationValues(facts, {} as WizardAnswers, {})
    const w = buildPortalWorksheet(v, {}, {})
    const verify = w.find((s) => s.title === "Verify Your Information")!
    return {
      bldg: verify.fields.find((f) => f.label === "Home Address — Building Number")?.value,
      street: verify.fields.find((f) => f.label === "Home Address — Street Name")?.value,
    }
  }
  it("parses when unconfirmed", () => {
    expect(homeFields({ "applicant.address.street": "742 Evergreen Terrace" }))
      .toEqual({ bldg: "742", street: "Evergreen Terrace" })
  })
  it("uses the confirmed split when present", () => {
    expect(
      homeFields({
        "applicant.address.street": "742 Evergreen Terrace",
        "applicant.address.buildingNumber": "742B",
        "applicant.address.streetName": "Evergreen Ter.",
        "applicant.address.streetConfirmed": "yes",
      })
    ).toEqual({ bldg: "742B", street: "Evergreen Ter." })
  })
})

describe("residence-history rows — per-row confirmed split", () => {
  it("parses an unconfirmed row and honours a confirmed one", () => {
    const intake = {
      residenceHistory: [
        { address: "10 Downing St", fromMonth: "2020-01" },
        { address: "un-parseable", buildingNumber: "7", streetName: "Rue X", streetConfirmed: true, fromMonth: "2019-01" },
      ],
    } as WizardAnswers
    const v = buildApplicationValues({}, intake, {})
    const w = buildPortalWorksheet(v, {}, {})
    const res = w.find((s) => s.title === "Residence History (past 5 years)")!
    expect(res.fields.find((f) => f.label === "Row 1 — Building Number")?.value).toBe("10")
    expect(res.fields.find((f) => f.label === "Row 1 — Street Name")?.value).toBe("Downing St")
    expect(res.fields.find((f) => f.label === "Row 2 — Building Number")?.value).toBe("7")
    expect(res.fields.find((f) => f.label === "Row 2 — Street Name")?.value).toBe("Rue X")
  })
})

describe("splitStreet — the underlying heuristic", () => {
  it("splits a leading building number", () => {
    expect(splitStreet("55 Water Street")).toEqual({ buildingNumber: "55", streetName: "Water Street" })
  })
  it("leaves a number-less line as street only", () => {
    expect(splitStreet("Broadway")).toEqual({ buildingNumber: "", streetName: "Broadway" })
  })
})
