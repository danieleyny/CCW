/**
 * PART D · PR D3 — the full 643-041 application: the facts→form mapper and the
 * template's build(), including the traps (dual-widget licence type + Section B,
 * Q29 row-1 has no "To", 5-year overflow detection).
 */
import { describe, expect, it } from "vitest"
import { buildApplicationValues } from "@/lib/forms/application"
import { FORM_TEMPLATES } from "@/lib/forms/templates"
import type { WizardAnswers } from "@/lib/intake/answers"

describe("buildApplicationValues — facts + intake → application values", () => {
  const facts = {
    "applicant.legalLastName": "Powell",
    "applicant.legalFirstName": "Marcus",
    "applicant.citizenship": "citizen",
    "employer.name": "Test Guard Co.",
  } as Record<string, string>

  it("maps identity, citizenship, licence type and Section B", () => {
    const intake: WizardAnswers = {
      licenseType: "carry",
      questionnaire: [{ no: 12, yes: true }, { no: 11, yes: false }],
      arrests: [{ narrative: "x" }],
      aliasName: "",
    }
    const v = buildApplicationValues(facts, intake, { licenseTrack: "carry_guard" })
    expect(v.lastName).toBe("Powell")
    expect(v.businessName).toBe("Test Guard Co.")
    expect(v.citizenship).toBe("Citizen")
    expect(v.licenseType).toBe("CarryGuardSecurity") // NOT CarryBusiness
    expect(v.q12).toBe("Yes")
    expect(v.q11).toBe("No")
    expect(v.q23).toBe("Yes") // from an arrest
    expect(v.q28).toBe("No") // no alias
  })

  it("flags a five-year history that overflows the form's four rows", () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ fromMonth: `200${i}-01`, address: `${i}` }))
    const v = buildApplicationValues(facts, { residenceHistory: five } as WizardAnswers, {})
    expect(v.residenceOverflow).toBe(true)
  })
})

describe("nypd_handgun_application build() — the traps", () => {
  const t = FORM_TEMPLATES.nypd_handgun_application
  it("ticks the correct licence type + Yes/No boxes; row 1 has no To", () => {
    const out = t.build!({
      lastName: "Powell",
      licenseType: "CarryGuardSecurity",
      citizenship: "Citizen",
      q10: "No",
      q12: "Yes",
      residenceHistory: [
        { fromMonth: "2018-06", toMonth: "", address: "A" },
        { fromMonth: "2015-01", toMonth: "2018-05", address: "B" },
      ],
    })
    expect(out.choices?.LicenseType).toBe("CarryGuardSecurity")
    expect(out.choices?.AlienOrCitizen).toBe("Citizen")
    expect(out.choices?.SectionB10).toBe("No")
    expect(out.choices?.SectionB12).toBe("Yes")
    // Row 1 gets no "To" (the form pre-prints PRESENT); row 2 does.
    expect(out.text?.ResidenceTo1).toBeUndefined()
    expect(out.text?.ResidenceTo2).toBe("2018-05")
    expect(out.text?.ResidenceFrom1).toBe("2018-06")
  })
})
