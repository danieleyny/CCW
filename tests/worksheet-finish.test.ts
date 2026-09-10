import { describe, expect, it } from "vitest"
import { buildApplicationValues } from "@/lib/forms/application"
import { buildPortalWorksheet } from "@/lib/disclosures/worksheet-portal"
import { portalDate, isDayAssumed } from "@/lib/forms/format"
import { lonStatementsFor, portalStep12StatementsFor } from "@/lib/requirements/lon"
import type { WizardAnswers } from "@/lib/intake/answers"

const sectionByTitle = (w: ReturnType<typeof buildPortalWorksheet>, t: string) => w.find((s) => s.title === t)!
const fieldVal = (w: ReturnType<typeof buildPortalWorksheet>, title: string, label: string) =>
  sectionByTitle(w, title).fields.find((f) => f.label === label || f.label.startsWith(label))?.value

describe("#1 history dates — month-only renders M/D/YYYY and is flagged", () => {
  it("portalDate coerces YYYY-MM to the 1st; isDayAssumed flags it", () => {
    expect(portalDate("2021-03")).toBe("3/1/2021")
    expect(portalDate("2022-01")).toBe("1/1/2022")
    expect(portalDate("2021-03-15")).toBe("3/15/2021")
    expect(isDayAssumed("2021-03")).toBe(true)
    expect(isDayAssumed("2021-03-15")).toBe(false)
  })
  it("residence + employment rows render the coerced date, with a day-assumed flag", () => {
    const intake = {
      residenceHistory: [{ fromMonth: "2021-03", toMonth: "2023-06", address: "123 Main St", city: "Bronx", state: "NY", zip: "10451", apt: "4B" }],
      employmentHistory: [{ fromMonth: "2022-01", employerName: "Acme", occupation: "Guard" }],
    } as WizardAnswers
    const w = buildPortalWorksheet(buildApplicationValues({}, intake, {}), {}, {})
    const res = sectionByTitle(w, "Residence History")
    const from = res.fields.find((f) => f.label.startsWith("Row 1 — From"))!
    expect(from.value).toBe("3/1/2021")
    expect(from.label).toContain("day assumed")
    expect(fieldVal(w, "Employment History", "History 1 — Start")).toBe("1/1/2022")
  })
})

describe("#2 residence table renders all eight columns", () => {
  it("each column has its own field", () => {
    const intake = {
      residenceHistory: [{ fromMonth: "2021-03-01", toMonth: "2023-06-01", address: "742 Evergreen Terrace", apt: "2", city: "Springfield", state: "NY", zip: "11111" }],
    } as WizardAnswers
    const w = buildPortalWorksheet(buildApplicationValues({}, intake, {}), {}, {})
    expect(fieldVal(w, "Residence History", "Row 1 — Building Number")).toBe("742")
    expect(fieldVal(w, "Residence History", "Row 1 — Street Name")).toBe("Evergreen Terrace")
    expect(fieldVal(w, "Residence History", "Row 1 — Apt/Unit/Suite")).toBe("2")
    expect(fieldVal(w, "Residence History", "Row 1 — City")).toBe("Springfield")
    expect(fieldVal(w, "Residence History", "Row 1 — State")).toBe("NY")
    expect(fieldVal(w, "Residence History", "Row 1 — Zip")).toBe("11111")
  })
})

describe("#3–#6 safeguard + safekeeping", () => {
  const facts = {
    "safeguard.firstName": "Dana",
    "safeguard.lastName": "Reyes",
    "safeguard.email": "dana@example.com",
    "safeguard.street": "55 Vanderbilt Ave",
    "safeguard.apt": "3",
    "safeguard.city": "Brooklyn",
    "safeguard.state": "NY",
    "safeguard.zip": "11205",
    "safekeeping.street": "9 Court St",
    "safekeeping.city": "Brooklyn",
    "safekeeping.state": "NY",
    "safekeeping.zip": "11201",
    "safeguard.method": "Locked safe",
  }
  const w = buildPortalWorksheet(buildApplicationValues(facts, {} as WizardAnswers, {}), {}, {})

  it("#5 safeguard name is two fields", () => {
    expect(fieldVal(w, "Safekeeping and Safeguarding", "Safeguard — First Name")).toBe("Dana")
    expect(fieldVal(w, "Safekeeping and Safeguarding", "Safeguard — Last Name")).toBe("Reyes")
  })
  it("#4 safeguard email reaches the worksheet", () => {
    expect(fieldVal(w, "Safekeeping and Safeguarding", "Safeguard — Email")).toBe("dana@example.com")
  })
  it("#3 safeguard address renders each part from its own field (nothing dumped into Street)", () => {
    expect(fieldVal(w, "Safekeeping and Safeguarding", "Safeguard Address — Street Name")).toBe("Vanderbilt Ave")
    expect(fieldVal(w, "Safekeeping and Safeguarding", "Safeguard Address — Building Number")).toBe("55")
    expect(fieldVal(w, "Safekeeping and Safeguarding", "Safeguard Address — Apt/Unit")).toBe("3")
    expect(fieldVal(w, "Safekeeping and Safeguarding", "Safeguard Address — City")).toBe("Brooklyn")
    expect(fieldVal(w, "Safekeeping and Safeguarding", "Safeguard Address — State")).toBe("NY")
    expect(fieldVal(w, "Safekeeping and Safeguarding", "Safeguard Address — Zip")).toBe("11205")
  })
  it("#6 safekeeping location is its own six-part address, distinct from home", () => {
    const sk = sectionByTitle(w, "Safekeeping and Safeguarding")
    expect(sk.fields.find((f) => f.label === "Safekeeping Location — Street Name")?.value).toBe("Court St")
    expect(sk.fields.find((f) => f.label === "Safekeeping Location — City")?.value).toBe("Brooklyn")
    expect(sk.fields.find((f) => f.label === "Safekeeping Location — Zip")?.value).toBe("11201")
  })
})

describe("#7 Letter of Necessity is gated by licence type", () => {
  it("concealed carry asks three statements: 3, 4, 6", () => {
    expect(lonStatementsFor("concealed_carry")).toEqual([3, 4, 6])
  })
  it("carry guard asks all six", () => {
    expect(lonStatementsFor("carry_guard")).toEqual([1, 2, 3, 4, 5, 6])
  })
  it("the worksheet renders only the applicable statements and flags none of the others", () => {
    const facts = { "safekeeping.state": "NY" }
    const v = buildApplicationValues(facts, {} as WizardAnswers, {})
    const w = buildPortalWorksheet(v, {}, { licenseTrack: "concealed_carry" })
    const lon = sectionByTitle(w, "Letter of Necessity")
    expect(lon.fields.map((f) => f.label)).toEqual(["Statement 3", "Statement 4", "Statement 6"])
    // Statement 1 (Carry Guard only) must not appear as a flagged omission.
    expect(lon.fields.some((f) => f.label === "Statement 1")).toBe(false)
  })
})

describe("Carry Guard alignment (tasks 1–5)", () => {
  it("task 1 — the employer's gun custodian is emitted on step 3 for a guard track", () => {
    const facts = { "sponsor.custodianName": "Pat Custodian", "sponsor.custodianLicenseNumber": "CUS-4471" }
    const w = buildPortalWorksheet(buildApplicationValues(facts, {} as WizardAnswers, {}), {}, { licenseTrack: "carry_guard" })
    expect(fieldVal(w, "Employment", "Gun Custodian — Name")).toBe("Pat Custodian")
    expect(fieldVal(w, "Employment", "Gun Custodian — License Number")).toBe("CUS-4471")
  })
  it("task 1 — a non-guard track never renders the custodian block", () => {
    const w = buildPortalWorksheet(buildApplicationValues({}, {} as WizardAnswers, {}), {}, { licenseTrack: "concealed_carry" })
    expect(sectionByTitle(w, "Employment").fields.some((f) => f.label.startsWith("Gun Custodian"))).toBe(false)
  })

  it("task 2 — portal step 12 yields exactly five statements for carry_guard (lop1 stays on the LON doc)", () => {
    expect(portalStep12StatementsFor("carry_guard")).toEqual([2, 3, 4, 5, 6])
    expect(lonStatementsFor("carry_guard")).toContain(1) // still collected for the § 5-04 letter
    const w = buildPortalWorksheet(buildApplicationValues({}, {} as WizardAnswers, {}), {}, { licenseTrack: "carry_guard" })
    const lon = sectionByTitle(w, "Letter of Necessity")
    expect(lon.fields.map((f) => f.label)).toEqual(["Statement 2", "Statement 3", "Statement 4", "Statement 5", "Statement 6"])
    expect(lon.fields.some((f) => f.label === "Statement 1")).toBe(false)
  })

  it("task 3 — a licensed firearm round-trips its licence number; an unlicensed one shows no number field", () => {
    const intake = {
      firearms: [
        { make: "Glock", model: "19", caliber: "9mm", serial: "AB123", licensed: "Yes", licenseNumber: "LIC-9987" },
        { make: "Ruger", model: "10/22", caliber: ".22", serial: "ZZ9", licensed: "No" },
      ],
    } as WizardAnswers
    const w = buildPortalWorksheet(buildApplicationValues({}, intake, {}), {}, {})
    expect(fieldVal(w, "Existing Guns", "Firearm 1 — Is this firearm licensed?")).toBe("Yes")
    expect(fieldVal(w, "Existing Guns", "Firearm 1 — License/Permit Number")).toBe("LIC-9987")
    expect(fieldVal(w, "Existing Guns", "Firearm 2 — Is this firearm licensed?")).toBe("No")
    expect(sectionByTitle(w, "Existing Guns").fields.some((f) => f.label === "Firearm 2 — License/Permit Number")).toBe(false)
  })

  it("task 4 — an employment-history row round-trips a structured city/state/zip", () => {
    const intake = {
      employmentHistory: [{ fromMonth: "2020-01", employerName: "Acme Security", employerAddress: "100 Market St", city: "Bronx", state: "NY", zip: "10451", occupation: "Guard" }],
    } as WizardAnswers
    const w = buildPortalWorksheet(buildApplicationValues({}, intake, {}), {}, {})
    expect(fieldVal(w, "Employment History", "History 1 — Address — Building Number")).toBe("100")
    expect(fieldVal(w, "Employment History", "History 1 — Address — City")).toBe("Bronx")
    expect(fieldVal(w, "Employment History", "History 1 — Address — State")).toBe("NY")
    expect(fieldVal(w, "Employment History", "History 1 — Address — Zip")).toBe("10451")
  })

  it("task 5 — residence Country is required and defaults to United States; a non-US row keeps its country", () => {
    const intake = {
      residenceHistory: [
        { fromMonth: "2022-01", address: "1 Main St", city: "Bronx", state: "NY", zip: "10451" },
        { fromMonth: "2019-01", toMonth: "2021-12", address: "1 Rue de Rivoli", city: "Paris", country: "France" },
      ],
    } as WizardAnswers
    const w = buildPortalWorksheet(buildApplicationValues({}, intake, {}), {}, {})
    const res = sectionByTitle(w, "Residence History")
    expect(res.fields.find((f) => f.label === "Row 1 — Country")?.value).toBe("United States")
    expect(res.fields.find((f) => f.label === "Row 2 — Country")?.value).toBe("France")
  })
})

describe("#8 confidentiality section on the worksheet", () => {
  it("renders the election, grounds and free text when a request is made", () => {
    const w = buildPortalWorksheet(buildApplicationValues({}, {} as WizardAnswers, {}), {}, {
      confidentiality: { requesting: "yes", g1a: true, item5: "I am a witness", election: "all" },
    })
    const con = sectionByTitle(w, "Confidentiality")
    expect(con.fields.find((f) => f.label === "Requesting confidentiality?")?.value).toBe("Yes")
    expect(con.fields.some((f) => f.label.includes("police, peace"))).toBe(true)
    expect(con.fields.find((f) => f.label === "Additional supportive information")?.value).toBe("I am a witness")
    expect(con.fields.find((f) => f.label === "Scope of request")?.value).toContain("Apply to all")
  })
  it("a non-request shows a single No", () => {
    const w = buildPortalWorksheet(buildApplicationValues({}, {} as WizardAnswers, {}), {}, {
      confidentiality: { requesting: "no" },
    })
    const con = sectionByTitle(w, "Confidentiality")
    expect(con.fields).toHaveLength(1)
    expect(con.fields[0].value).toBe("No")
  })
})
