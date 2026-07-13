import { describe, expect, it } from "vitest"
import {
  requirementApplies,
  generateCaseRequirements,
  type IntakeAnswers,
} from "@/lib/requirements/generate"

const carry: IntakeAnswers = { isCarry: true }
const renewal: IntakeAnswers = { isCarry: true, isRenewal: true }
const premises: IntakeAnswers = { isCarry: false, isPremises: true }
const premisesRenewal: IntakeAnswers = { isCarry: false, isPremises: true, isRenewal: true }
const leo: IntakeAnswers = { isCarry: true, isRetiredLeo: true }

describe("requirementApplies — track × renewal matrix", () => {
  it("always fires for everyone", () => {
    for (const a of [carry, renewal, premises, leo]) expect(requirementApplies("always", a)).toBe(true)
  })

  it("carry_only: carry yes, premises no", () => {
    expect(requirementApplies("carry_only", carry)).toBe(true)
    expect(requirementApplies("carry_only", renewal)).toBe(true)
    expect(requirementApplies("carry_only", premises)).toBe(false)
  })

  it("carry_not_renewal (REF-01/TRN-01): drops for renewals and premises", () => {
    expect(requirementApplies("carry_not_renewal", carry)).toBe(true)
    expect(requirementApplies("carry_not_renewal", renewal)).toBe(false)
    expect(requirementApplies("carry_not_renewal", premises)).toBe(false)
  })

  it("premises rules fire only for premises; REF-02 drops on renewal", () => {
    expect(requirementApplies("premises_only", premises)).toBe(true)
    expect(requirementApplies("premises_only", carry)).toBe(false)
    expect(requirementApplies("premises_not_renewal", premises)).toBe(true)
    expect(requirementApplies("premises_not_renewal", premisesRenewal)).toBe(false)
  })

  it("if_renewal (RNW-01) and if_retired_leo (LEO-*) fire only for their flag", () => {
    expect(requirementApplies("if_renewal", renewal)).toBe(true)
    expect(requirementApplies("if_renewal", carry)).toBe(false)
    expect(requirementApplies("if_retired_leo", leo)).toBe(true)
    expect(requirementApplies("if_retired_leo", carry)).toBe(false)
  })

  it("disclosure triggers fire only on explicit yes", () => {
    expect(requirementApplies("if_arrest_hx", { ...carry, hasArrestHistory: true })).toBe(true)
    expect(requirementApplies("if_arrest_hx", carry)).toBe(false)
    expect(requirementApplies("if_cohabitants", { ...carry, hasCohabitants: true })).toBe(true)
    expect(requirementApplies("if_oop_hx", carry)).toBe(false)
    expect(requirementApplies("if_any_q_yes", { ...carry, anyQuestionYes: true })).toBe(true)
    expect(requirementApplies("if_lpr_under_7yr", { ...carry, lprUnder7yr: true })).toBe(true)
    expect(requirementApplies("if_veteran", { ...carry, isVeteran: true })).toBe(true)
    expect(requirementApplies("if_name_change", carry)).toBe(false)
  })

  it("unknown triggers are conservative: never apply", () => {
    expect(requirementApplies("if_totally_new_rule", carry)).toBe(false)
  })
})

describe("generateCaseRequirements", () => {
  const registry = [
    { id: "1", req_code: "REF-01", trigger_cond: "carry_not_renewal" },
    { id: "2", req_code: "RNW-01", trigger_cond: "if_renewal" },
    { id: "3", req_code: "ARR-01", trigger_cond: "if_arrest_hx" },
    { id: "4", req_code: "FEE-01", trigger_cond: "always" },
  ]

  it("returns EVERY row with an applies decision (N/A rows are provable)", () => {
    const out = generateCaseRequirements(registry, renewal)
    expect(out).toHaveLength(4)
    expect(out.find((r) => r.reqCode === "REF-01")!.applies).toBe(false)
    expect(out.find((r) => r.reqCode === "RNW-01")!.applies).toBe(true)
    expect(out.find((r) => r.reqCode === "ARR-01")!.applies).toBe(false)
    expect(out.find((r) => r.reqCode === "FEE-01")!.applies).toBe(true)
  })
})
