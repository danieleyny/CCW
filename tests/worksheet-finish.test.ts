import { describe, expect, it } from "vitest"
import { buildApplicationValues } from "@/lib/forms/application"
import { buildPortalWorksheet } from "@/lib/disclosures/worksheet-portal"
import { portalDate, isDayAssumed } from "@/lib/forms/format"
import { lonStatementsFor } from "@/lib/requirements/lon"
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
    const res = sectionByTitle(w, "Residence History (past 5 years)")
    const from = res.fields.find((f) => f.label.startsWith("Row 1 — From"))!
    expect(from.value).toBe("3/1/2021")
    expect(from.label).toContain("day assumed")
    expect(fieldVal(w, "Employment", "History 1 — Start")).toBe("1/1/2022")
  })
})

describe("#2 residence table renders all eight columns", () => {
  it("each column has its own field", () => {
    const intake = {
      residenceHistory: [{ fromMonth: "2021-03-01", toMonth: "2023-06-01", address: "742 Evergreen Terrace", apt: "2", city: "Springfield", state: "NY", zip: "11111" }],
    } as WizardAnswers
    const w = buildPortalWorksheet(buildApplicationValues({}, intake, {}), {}, {})
    expect(fieldVal(w, "Residence History (past 5 years)", "Row 1 — Building Number")).toBe("742")
    expect(fieldVal(w, "Residence History (past 5 years)", "Row 1 — Street Name")).toBe("Evergreen Terrace")
    expect(fieldVal(w, "Residence History (past 5 years)", "Row 1 — Apt/Unit/Suite")).toBe("2")
    expect(fieldVal(w, "Residence History (past 5 years)", "Row 1 — City")).toBe("Springfield")
    expect(fieldVal(w, "Residence History (past 5 years)", "Row 1 — State")).toBe("NY")
    expect(fieldVal(w, "Residence History (past 5 years)", "Row 1 — Zip")).toBe("11111")
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
    expect(fieldVal(w, "Safeguarding Person", "Safeguard — First Name")).toBe("Dana")
    expect(fieldVal(w, "Safeguarding Person", "Safeguard — Last Name")).toBe("Reyes")
  })
  it("#4 safeguard email reaches the worksheet", () => {
    expect(fieldVal(w, "Safeguarding Person", "Safeguard — Email")).toBe("dana@example.com")
  })
  it("#3 safeguard address renders each part from its own field (nothing dumped into Street)", () => {
    expect(fieldVal(w, "Safeguarding Person", "Safeguard Address — Street Name")).toBe("Vanderbilt Ave")
    expect(fieldVal(w, "Safeguarding Person", "Safeguard Address — Building Number")).toBe("55")
    expect(fieldVal(w, "Safeguarding Person", "Safeguard Address — Apt/Unit")).toBe("3")
    expect(fieldVal(w, "Safeguarding Person", "Safeguard Address — City")).toBe("Brooklyn")
    expect(fieldVal(w, "Safeguarding Person", "Safeguard Address — State")).toBe("NY")
    expect(fieldVal(w, "Safeguarding Person", "Safeguard Address — Zip")).toBe("11205")
  })
  it("#6 safekeeping location is its own six-part address, distinct from home", () => {
    const sk = sectionByTitle(w, "Safekeeping (where the handgun is secured)")
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

describe("#8 confidentiality section on the worksheet", () => {
  it("renders the election, grounds and free text when a request is made", () => {
    const w = buildPortalWorksheet(buildApplicationValues({}, {} as WizardAnswers, {}), {}, {
      confidentiality: { requesting: "yes", g1a: true, item5: "I am a witness", election: "all" },
    })
    const con = sectionByTitle(w, "Confidentiality (Public-Records Exemption)")
    expect(con.fields.find((f) => f.label === "Requesting confidentiality?")?.value).toBe("Yes")
    expect(con.fields.some((f) => f.label.includes("police, peace"))).toBe(true)
    expect(con.fields.find((f) => f.label === "Additional supportive information")?.value).toBe("I am a witness")
    expect(con.fields.find((f) => f.label === "Scope of request")?.value).toContain("Apply to all")
  })
  it("a non-request shows a single No", () => {
    const w = buildPortalWorksheet(buildApplicationValues({}, {} as WizardAnswers, {}), {}, {
      confidentiality: { requesting: "no" },
    })
    const con = sectionByTitle(w, "Confidentiality (Public-Records Exemption)")
    expect(con.fields).toHaveLength(1)
    expect(con.fields[0].value).toBe("No")
  })
})
