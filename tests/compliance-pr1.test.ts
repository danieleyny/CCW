/**
 * COMPLIANCE PR1 — the three corrections, at the registry-logic level.
 *   1. SSN card is a required upload for ALL licence types (SSN-01, trigger `always`).
 *   2. Safe photos are premise-business only (SAF-01, trigger `premises_only`) —
 *      they no longer fire for concealed carry or carry guard.
 *   3. Reference counts are track-dependent: 4 concealed, 2 carry-guard / premises,
 *      0 renewal — and carry-guard's two must be non-family.
 */
import { describe, expect, it } from "vitest"
import { requirementApplies, type IntakeAnswers } from "@/lib/requirements/generate"
import { requiredReferences } from "@/lib/intake/schema"
import type { WizardAnswers } from "@/lib/intake/answers"

const concealed: IntakeAnswers = { isCarry: true }
const carryGuard: IntakeAnswers = { isCarry: true, isArmedGuard: true }
const premises: IntakeAnswers = { isCarry: false, isPremises: true }

describe("Correction 1 — SSN card required for all licence types", () => {
  it("SSN-01 (trigger `always`) fires for every track", () => {
    for (const a of [concealed, carryGuard, premises]) {
      expect(requirementApplies("always", a)).toBe(true)
    }
  })
})

describe("Correction 2 — safe photos are premise-business only", () => {
  it("SAF-01 (trigger `premises_only`) fires for premises, NOT carry or carry-guard", () => {
    expect(requirementApplies("premises_only", premises)).toBe(true)
    expect(requirementApplies("premises_only", concealed)).toBe(false)
    expect(requirementApplies("premises_only", carryGuard)).toBe(false)
  })
})

describe("Correction 3 — track-dependent reference counts", () => {
  const base: WizardAnswers = {}
  it("concealed carry needs 4", () => {
    expect(requiredReferences(base, { isRenewal: false, licenseTrack: "concealed_carry" })).toBe(4)
  })
  it("carry guard and special carry guard need 2", () => {
    expect(requiredReferences(base, { isRenewal: false, licenseTrack: "carry_guard" })).toBe(2)
    expect(requiredReferences(base, { isRenewal: false, licenseTrack: "special_carry_guard" })).toBe(2)
  })
  it("premises needs 2", () => {
    expect(requiredReferences({ licenseType: "premises" }, { isRenewal: false })).toBe(2)
  })
  it("renewals need 0", () => {
    expect(requiredReferences(base, { isRenewal: true, licenseTrack: "concealed_carry" })).toBe(0)
  })
})
