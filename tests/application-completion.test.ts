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
  it("reads a 'yes' from the portal disclosure store for a concierge case (empty wizard)", () => {
    // Portal question numbers: q5 armed forces, q7 arrest, q13 OOP against you,
    // q15 domestic, q1 alias, q7_felony conviction, q17 confidentiality.
    const { flags, source } = deriveConditionFlags(null, {
      ...noSources,
      disclosures: { q5: "yes", q7: "yes", q7_felony: "yes", q13: "no", q15: "yes", q1: "no", q17: "yes" },
    })
    expect(source.sectionB).toBe("disclosure-store")
    expect(flags.anyQuestionYes).toBe(true)
    expect(flags.hasArrestHistory).toBe(true) // q7
    expect(flags.hasDomesticIncident).toBe(true) // q15
    expect(flags.isVeteran).toBe(true) // q5
    expect(flags.hasOopHistory).toBe(false) // q13 no
    expect(flags.hasNameChange).toBe(false) // q1 no
    expect(flags.hasFelonyConviction).toBe(true) // q7_felony → Certificate of Relief
    expect(flags.wantsConfidentiality).toBe(true) // q17 → Public Records Exemption
  })

  it("an all-'no' disclosure store spawns nothing", () => {
    const disclosures = Object.fromEntries(
      ["1", "5", "7", "13", "14", "15"].map((n) => [`q${n}`, "no"])
    )
    const { flags } = deriveConditionFlags(null, { ...noSources, disclosures })
    expect(flags.anyQuestionYes).toBe(false)
    expect(flags.hasArrestHistory).toBe(false)
    expect(flags.hasFelonyConviction).toBe(false)
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

  it("the cohabitant roster and a name-change fact win regardless of Q1", () => {
    const { flags, source } = deriveConditionFlags(null, { disclosures: { q1: "no" }, cohabitantCount: 2, nameChangeFact: true })
    expect(flags.hasCohabitants).toBe(true)
    expect(source.cohabitants).toBe("roster")
    expect(flags.hasNameChange).toBe(true) // the alias fact overrides a Q1 'no'
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

describe("Part 4/5 — Letter of Necessity fills, Q20a is its own question", () => {
  it("sets lop1…lop6 on the application from the LON answers", () => {
    const v = buildApplicationValues({}, {} as WizardAnswers, {
      letterOfNecessity: { lop1: "Armored-car messenger.", lop3: "Locked in the vault.", lop6: "Read the Penal Law." },
    })
    expect(v.lop1).toBe("Armored-car messenger.")
    expect(v.lop3).toBe("Locked in the vault.")
    expect(v.lop6).toBe("Read the Penal Law.")
    expect(v.lop2).toBe("") // unanswered acknowledgement stays blank, never invented
  })

  it("Q20 (entity) and Q20a (people) resolve independently", () => {
    const v = buildApplicationValues({}, {} as WizardAnswers, { disclosures: { q20: "no", q20a: "yes" } })
    expect(v.q20).toBe("No")
    expect(v.q20a).toBe("Yes")
  })
})

describe("Letter of Necessity — co-authored field ownership (sponsored split)", () => {
  it("employer owns statements 1/3/5; applicant owns 2/4/6", async () => {
    const { questionnaireFor } = await import("@/lib/requirements/questionnaires")
    const q = questionnaireFor("letter-of-necessity")!
    const party = Object.fromEntries((q.fields ?? []).map((f) => [f.name, f.party]))
    expect(party.lop1).toBe("sponsor")
    expect(party.lop3).toBe("sponsor")
    expect(party.lop5).toBe("sponsor")
    expect(party.lop2).toBe("applicant")
    expect(party.lop4).toBe("applicant")
    expect(party.lop6).toBe("applicant")
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
