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

  it("maps identity/citizenship/licence type, and Section B from the disclosure store", () => {
    const v = buildApplicationValues(facts, { licenseType: "carry" } as WizardAnswers, {
      licenseTrack: "carry_guard",
      disclosures: { q10: "no", q12: "yes", q12_explain: "x", q23: "yes", q24: "no" },
    })
    expect(v.lastName).toBe("Powell")
    expect(v.businessName).toBe("Test Guard Co.")
    expect(v.citizenship).toBe("Citizen")
    expect(v.licenseType).toBe("CarryGuardSecurity") // NOT CarryBusiness
    expect(v.q10).toBe("No")
    expect(v.q12).toBe("Yes")
    expect(v.q23).toBe("Yes")
    expect(v.q24).toBe("No")
    expect(v.q12_explain).toBeUndefined() // explanation keys are not Section B boxes
  })

  it("NEVER infers a sworn answer from an empty collection (the critical correctness fix)", () => {
    // Nothing entered: no disclosure store, no questionnaire, empty/absent arrays.
    const v = buildApplicationValues(facts, { arrests: [], aliasName: "" } as WizardAnswers, {})
    for (const q of ["q10", "q12", "q23", "q24", "q27", "q28"]) {
      expect(v[q], `${q} must be UNSET (not-asked), never a false "No"`).toBeUndefined()
    }
  })

  it("falls back to legacy intake.questionnaire only when the disclosure store is empty", () => {
    const v = buildApplicationValues(facts, { questionnaire: [{ no: 12, yes: true }, { no: 11, yes: false }] } as WizardAnswers, {})
    expect(v.q12).toBe("Yes")
    expect(v.q11).toBe("No")
    // But a disclosure store, when present, wins and legacy is ignored.
    const v2 = buildApplicationValues(facts, { questionnaire: [{ no: 12, yes: false }] } as WizardAnswers, { disclosures: { q12: "yes" } })
    expect(v2.q12).toBe("Yes")
  })

  it("reads safeguard facts-first, intake as fallback", () => {
    const v = buildApplicationValues(
      { "safeguard.name": "Dana Reyes", "safeguard.method": "In a locked safe at my residence" } as Record<string, string>,
      { safeguardName: "STALE", safeguardRelation: "Brother" } as WizardAnswers,
      {}
    )
    expect(v.safeguardName).toBe("Dana Reyes") // fact wins
    expect(v.safeguardMethod).toBe("In a locked safe at my residence")
    expect(v.safeguardRelation).toBe("Brother") // intake fallback where no fact
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
    // Row 1 gets no "To" (the form pre-prints PRESENT); row 2 does. Dates render US
    // MM/YYYY on the form (Part 6) though stored ISO.
    expect(out.text?.ResidenceTo1).toBeUndefined()
    expect(out.text?.ResidenceTo2).toBe("05/2018")
    expect(out.text?.ResidenceFrom1).toBe("06/2018")
  })
})
