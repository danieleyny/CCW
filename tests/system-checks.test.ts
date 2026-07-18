/**
 * System-verified controls must never make a case look cleaner than the
 * applicant's own answers. These tests exist mostly to stop the eligibility
 * predicates from drifting into "assume yes when unanswered".
 */
import { describe, expect, it } from "vitest"
import { intakeSystemVerdicts, isSystemVerified, SYSTEM_VERIFIED_CODES } from "@/lib/requirements/system-checks"
import type { WizardAnswers } from "@/lib/intake/answers"

const clean: WizardAnswers = {
  dob: "1990-01-01",
  residence: "nyc",
  prohibitorFelony: false,
  prohibitorMentalHealth: false,
  prohibitorActiveOop: false,
  prohibitorUnlawfulDrug: false,
  hasOtherLicense: false,
}

describe("system-verified controls", () => {
  it("covers exactly the controls we actually verify ourselves", () => {
    expect(SYSTEM_VERIFIED_CODES.sort()).toEqual(["ELG-01", "ELG-02", "ELG-03", "FMT-01", "OOS-02"])
    // A real customer task must never be auto-satisfied.
    expect(isSystemVerified("IDN-01")).toBe(false)
    expect(isSystemVerified("AFF-01")).toBe(false)
    expect(isSystemVerified("FEE-01")).toBe(false)
  })

  it("satisfies the eligibility items a clean intake actually answers", () => {
    expect(intakeSystemVerdicts(clean).sort()).toEqual(["ELG-01", "ELG-02", "ELG-03", "OOS-02"])
  })

  it("leaves everything pending when intake said nothing", () => {
    expect(intakeSystemVerdicts({})).toEqual([])
  })

  it("never clears a disqualifier the applicant reported", () => {
    expect(intakeSystemVerdicts({ ...clean, prohibitorFelony: true })).not.toContain("ELG-03")
    expect(intakeSystemVerdicts({ ...clean, prohibitorActiveOop: true })).not.toContain("ELG-03")
    // Unanswered is not "no".
    expect(intakeSystemVerdicts({ ...clean, prohibitorUnlawfulDrug: undefined })).not.toContain("ELG-03")
  })

  it("does not vouch for an under-21 applicant or an unusable date of birth", () => {
    const soon = new Date()
    soon.setFullYear(soon.getFullYear() - 20)
    expect(intakeSystemVerdicts({ ...clean, dob: soon.toISOString().slice(0, 10) })).not.toContain("ELG-01")
    expect(intakeSystemVerdicts({ ...clean, dob: "not-a-date" })).not.toContain("ELG-01")
  })

  it("does not vouch for NYC residence when they said non-resident", () => {
    expect(intakeSystemVerdicts({ ...clean, residence: "non_resident" })).not.toContain("ELG-02")
  })
})
