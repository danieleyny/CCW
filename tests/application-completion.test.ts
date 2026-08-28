/**
 * APPLICATION_COMPLETION — the store migration (Parts 1–3): conditional flags and
 * the worksheet must read the canonical stores, not the (empty-for-concierge) wizard.
 */
import { describe, expect, it } from "vitest"
import { deriveConditionFlags } from "@/lib/requirements/conditions"
import { buildWorksheet } from "@/lib/requirements/worksheet"
import { buildApplicationValues } from "@/lib/forms/application"
import { usDate, usMonthYear } from "@/lib/forms/format"
import type { WizardAnswers } from "@/lib/intake/answers"

const noSources = { disclosures: null, cohabitantCount: 0, nameChangeFact: false }

describe("deriveConditionFlags — canonical store first", () => {
  it("reads Section B 'yes' from the disclosure store for a concierge case (empty wizard)", () => {
    const { flags, source } = deriveConditionFlags(null, {
      ...noSources,
      disclosures: { q15: "yes", q23: "yes", q24: "no", q27: "yes", q28: "no" },
    })
    expect(source.sectionB).toBe("disclosure-store")
    expect(flags.anyQuestionYes).toBe(true)
    expect(flags.hasArrestHistory).toBe(true) // q23
    expect(flags.hasDomesticIncident).toBe(true) // q27
    expect(flags.isVeteran).toBe(true) // q15
    expect(flags.hasOopHistory).toBe(false) // q24/25/26 all no
    expect(flags.hasNameChange).toBe(false) // q28 no
  })

  it("an all-'no' disclosure store spawns nothing", () => {
    const disclosures = Object.fromEntries(
      ["10", "15", "23", "24", "25", "26", "27", "28"].map((n) => [`q${n}`, "no"])
    )
    const { flags } = deriveConditionFlags(null, { ...noSources, disclosures })
    expect(flags.anyQuestionYes).toBe(false)
    expect(flags.hasArrestHistory).toBe(false)
  })

  it("falls back to WizardAnswers when there is no disclosure store", () => {
    const { flags, source } = deriveConditionFlags(
      { arrests: [{ charge: "x" }], ordersOfProtection: [{ court: "y" }] } as unknown as WizardAnswers,
      noSources
    )
    expect(source.sectionB).toBe("wizard")
    expect(flags.hasArrestHistory).toBe(true)
    expect(flags.hasOopHistory).toBe(true)
    expect(flags.anyQuestionYes).toBe(true)
  })

  it("the cohabitant roster and a name-change fact win regardless of Q28", () => {
    const { flags, source } = deriveConditionFlags(null, { disclosures: { q28: "no" }, cohabitantCount: 2, nameChangeFact: true })
    expect(flags.hasCohabitants).toBe(true)
    expect(source.cohabitants).toBe("roster")
    expect(flags.hasNameChange).toBe(true) // the alias fact overrides a Q28 'no'
  })
})

describe("buildWorksheet — reads the assembled application values", () => {
  const facts = {
    "applicant.legalLastName": "Powell",
    "applicant.legalFirstName": "Marcus",
    "applicant.dob": "1990-04-12",
    "applicant.placeOfBirth": "Brooklyn, NY",
    "applicant.address.street": "1 Main St",
    "applicant.address.city": "New York",
    "applicant.address.zip": "10001",
    "applicant.citizenship": "citizen",
    "applicant.height": "70",
    "applicant.weight": "180",
    "applicant.sex": "M",
    "applicant.hairColor": "Brown",
    "applicant.eyeColor": "Brown",
  } as Record<string, string>

  it("fills identity/physical/DOB/Section B rows a concierge case would otherwise leave blank", () => {
    const v = buildApplicationValues(facts, { licenseType: "carry" } as WizardAnswers, {
      licenseTrack: "concealed_carry",
      disclosures: { q10: "no", q23: "yes" },
    })
    const sections = buildWorksheet(v, { applicantName: "Marcus Powell" })
    const rows = sections.flatMap((s) => s.rows)
    const byLabel = (frag: string) => rows.find((r) => r.label.toLowerCase().includes(frag))
    // The bug printed "— not answered yet —" over these; now they carry real values.
    expect(byLabel("date of birth")?.value).toBe("04/12/1990") // US, not ISO (Part 6)
    expect(byLabel("place of birth")?.value).toBe("Brooklyn, NY")
    expect(rows.some((r) => r.value === "U.S. citizen")).toBe(true)
    // Section B Q23 resolves from the disclosure store.
    const q23 = rows.find((r) => r.questionNo === "23")
    expect(q23?.value).toMatch(/^Yes/)
    const q10 = rows.find((r) => r.questionNo === "10")
    expect(q10?.value).toBe("No")
  })
})

describe("usDate / usMonthYear — format at the boundary", () => {
  it("ISO → US", () => {
    expect(usDate("1990-04-12")).toBe("04/12/1990")
    expect(usDate("1990-04-12T00:00:00Z")).toBe("04/12/1990")
    expect(usMonthYear("2021-03")).toBe("03/2021")
    expect(usMonthYear("2021-03-15")).toBe("03/2021")
  })
  it("passes through blanks and already-formatted values", () => {
    expect(usDate("")).toBe("")
    expect(usDate(null)).toBe("")
    expect(usDate("04/12/1990")).toBe("04/12/1990")
    expect(usMonthYear("March 2021")).toBe("March 2021")
  })
})
