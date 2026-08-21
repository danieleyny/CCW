/**
 * resolveArmedTrack — the derived Carry Guard category. Pure function, all four
 * branch outcomes plus the recompute-on-change case (SPONSORED_APPLICANT_PORTAL
 * verification #4). No DB.
 */
import { describe, expect, it } from "vitest"
import { resolveArmedTrack } from "@/lib/requirements/track"
import type { WizardAnswers } from "@/lib/intake/answers"

const base = (o: Partial<WizardAnswers>): WizardAnswers => ({ ...o })

describe("resolveArmedTrack", () => {
  it("Brooklyn (five boroughs) → carry_guard, no blockers", () => {
    const r = resolveArmedTrack(base({ residence: "nyc", borough: "Brooklyn", legalState: "NY" }))
    expect(r.track).toBe("carry_guard")
    expect(r.blockers).toEqual([])
    expect(r.isArmedGuard).toBe(true)
    expect(r.needsCountyLicenseDoc).toBe(false)
    // Holds no other licence → needs the §5-09 pre-licence exemption.
    expect(r.needsPreLicenseExemption).toBe(true)
  })

  it("Westchester + holds county licence → special_carry_guard, SCG-01 seeded", () => {
    const r = resolveArmedTrack(
      base({ residence: "non_resident", legalState: "NY", legalCity: "Yonkers", homeCountyPistolLicense: "yes" })
    )
    expect(r.track).toBe("special_carry_guard")
    expect(r.isArmedGuard).toBe(true)
    expect(r.needsCountyLicenseDoc).toBe(true) // SCG-01
    expect(r.blockers).toEqual([])
  })

  it("Westchester + NO county licence → sponsored_unresolved, county prerequisite named", () => {
    const r = resolveArmedTrack(
      base({ residence: "non_resident", legalState: "NY", homeCountyPistolLicense: "no" })
    )
    expect(r.track).toBe("sponsored_unresolved")
    expect(r.isArmedGuard).toBe(false) // do NOT seed the applicant NYPD set
    expect(r.blockers.length).toBe(1)
    expect(r.blockers[0]).toMatch(/county/i)
  })

  it("'unsure' on the county licence → unresolved, but raises a staff task not the hard blocker", () => {
    const r = resolveArmedTrack(
      base({ residence: "non_resident", legalState: "NY", homeCountyPistolLicense: "unsure" })
    )
    expect(r.track).toBe("sponsored_unresolved")
    expect(r.needsCountyLicenseTask).toBe(true)
  })

  it("New Jersey address, NYC assignment → sponsored_unresolved, must confirm with License Division", () => {
    const r = resolveArmedTrack(
      base({ residence: "non_resident", legalState: "NJ", nycAssignment: true })
    )
    expect(r.track).toBe("sponsored_unresolved")
    expect(r.mustConfirmWithLicenseDivision).toBe(true)
    expect(r.isArmedGuard).toBe(false)
  })

  it("already holds another pistol licence → no §5-09 pre-licence exemption needed", () => {
    const r = resolveArmedTrack(base({ residence: "nyc", otherPistolLicense: true }))
    expect(r.track).toBe("carry_guard")
    expect(r.needsPreLicenseExemption).toBe(false)
  })

  it("recompute: flipping the county-licence answer changes the outcome", () => {
    const noLicence = resolveArmedTrack(base({ residence: "non_resident", legalState: "NY", homeCountyPistolLicense: "no" }))
    const withLicence = resolveArmedTrack(base({ residence: "non_resident", legalState: "NY", homeCountyPistolLicense: "yes" }))
    expect(noLicence.track).toBe("sponsored_unresolved")
    expect(withLicence.track).toBe("special_carry_guard")
    expect(withLicence.needsCountyLicenseDoc).toBe(true)
  })
})
