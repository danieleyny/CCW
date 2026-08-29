import { describe, expect, it } from "vitest"
import { factDef } from "@/lib/facts/registry"
import { buildFactGroups } from "@/lib/facts/details-view"

const keysIn = (facts: Record<string, string>, group: Parameters<typeof buildFactGroups>[2], isRenewal = false) =>
  buildFactGroups(facts, false, group, true, isRenewal)
    .groups.flatMap((g) => g.rows)
    .map((r) => r.key)

describe("#3 citizenship — three options and a conditional alien-reg", () => {
  it("offers exactly three options", () => {
    expect(factDef("applicant.citizenship")?.options).toEqual([
      "U.S. citizen",
      "Lawful permanent resident (green card)",
      "Neither",
    ])
  })
  it("alien registration # is conditional on lawful permanent resident", () => {
    expect(factDef("applicant.alienRegistrationNumber")?.showWhen).toEqual({
      key: "applicant.citizenship",
      equals: ["Lawful permanent resident (green card)"],
    })
    // The showWhen carries into the serialized row so the client can gate it.
    const row = buildFactGroups({}, false, ["you"], true).groups.flatMap((g) => g.rows).find((r) => r.key === "applicant.alienRegistrationNumber")
    expect(row?.showWhen?.equals).toContain("Lawful permanent resident (green card)")
  })
})

describe("#3 prior licence number is renewal-only (server gate)", () => {
  it("absent on a non-renewal case, present on a renewal", () => {
    expect(keysIn({}, ["you"], false)).not.toContain("applicant.priorLicenseNumber")
    expect(keysIn({}, ["you"], true)).toContain("applicant.priorLicenseNumber")
  })
})

describe("#5 employer — start date gated on employed, unit under street", () => {
  it("start date is conditional on employed = Yes and no longer optional", () => {
    const sd = factDef("employer.startDate")
    expect(sd?.showWhen).toEqual({ key: "employer.employed", equals: ["Yes"] })
    expect(sd?.optional).toBeFalsy()
  })
  it("business unit sits directly after employer street in the registry order", () => {
    const keys = keysIn({}, ["employer"])
    expect(keys.indexOf("employer.unit")).toBe(keys.indexOf("employer.address.street") + 1)
  })
})

describe("#7 counsel — five conditional fields, no optional tags", () => {
  it("each detail field is gated on represented = Yes and none is tagged optional", () => {
    for (const k of ["counsel.firstName", "counsel.lastName", "counsel.firm", "counsel.email", "counsel.phone"]) {
      const d = factDef(k)
      expect(d?.showWhen).toEqual({ key: "counsel.represented", equals: ["Yes"] })
      expect(d?.optional).toBeFalsy()
    }
  })
})

describe("#14 the meter counts only visible required fields", () => {
  it("employer conditionals don't count until employed = Yes", () => {
    const notEmployed = buildFactGroups({ "employer.employed": "No" }, false, ["employer"], true).total
    const employed = buildFactGroups({ "employer.employed": "Yes" }, false, ["employer"], true).total
    // Turning employment on reveals name/street/city/state/zip/phone/type/title/start.
    expect(employed).toBeGreaterThan(notEmployed)
  })
  it("counsel details don't count until represented = Yes", () => {
    const no = buildFactGroups({ "counsel.represented": "No" }, false, ["counsel"], true).total
    const yes = buildFactGroups({ "counsel.represented": "Yes" }, false, ["counsel"], true).total
    expect(yes).toBe(no + 5)
  })
})

describe("#4 home phone is hidden from the editor", () => {
  it("home phone never renders; cell + work do", () => {
    const keys = keysIn({}, ["contact"])
    expect(keys).not.toContain("applicant.phone.home")
    expect(keys).toContain("applicant.phone.cell")
    expect(keys).toContain("applicant.phone.work")
  })
})
