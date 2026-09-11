/**
 * Carry Guard task 7 — precinct is DERIVED from the ZIP (never asked) and formatted
 * exactly as the portal prints it. The lookup table is a seed the owner populates from
 * NYPD's authoritative source, so here we lock the FORMAT and the honest fallback: an
 * unknown ZIP yields the Precinct Finder link, never a blank required box.
 */
import { describe, expect, it } from "vitest"
import { formatPrecinct, precinctForZip, PRECINCT_FINDER_URL } from "@/lib/portal/precinct"
import { buildApplicationValues } from "@/lib/forms/application"
import { buildPortalWorksheet } from "@/lib/disclosures/worksheet-portal"
import type { WizardAnswers } from "@/lib/intake/answers"

describe("precinct derivation", () => {
  it("formats a precinct exactly as the portal prints it (zero-padded to 3 digits)", () => {
    expect(formatPrecinct("Manhattan", 14)).toBe("Manhattan - 014 PRECINCT")
    expect(formatPrecinct("Bronx", 52)).toBe("Bronx - 052 PRECINCT")
    expect(formatPrecinct("Staten Island", 121)).toBe("Staten Island - 121 PRECINCT")
  })

  it("returns null for a ZIP not in the (seed) table or a malformed ZIP", () => {
    expect(precinctForZip("10001")).toBeNull() // seed table is empty until the owner fills it
    expect(precinctForZip("abcde")).toBeNull()
    expect(precinctForZip("")).toBeNull()
    expect(precinctForZip(undefined)).toBeNull()
  })

  it("the worksheet points staff at the Precinct Finder rather than a blank required box", () => {
    const facts = { "applicant.home.zip": "10001" }
    const w = buildPortalWorksheet(buildApplicationValues(facts, {} as WizardAnswers, {}), {}, {})
    const step1 = w.find((s) => s.title === "Verify Your Information")!
    const precinct = step1.fields.find((f) => f.label.startsWith("Precinct"))
    expect(precinct?.value).toBe(PRECINCT_FINDER_URL)
    expect(precinct?.missing).toBe(false) // optional — never a red required blank
  })
})
