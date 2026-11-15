import { describe, expect, it } from "vitest"
import { planCaseRequirementMaterialization } from "@/lib/requirements/materialize"

describe("requirement materialization across registry versions", () => {
  it("uses req_code as the per-case identity and does not insert a second card", () => {
    const plan = planCaseRequirementMaterialization(
      [{ id: "registry-v2", req_code: "RES-01", trigger_cond: "always" }],
      [{ id: "case-row", requirementId: "registry-v1", reqCode: "RES-01", status: "pending", triggerCond: "always" }],
      {}
    )
    expect(plan.inserts).toHaveLength(0)
    expect(plan.generated).toHaveLength(1)
  })

  it("re-evaluates an existing card with its historical trigger, not the new version's trigger", () => {
    const plan = planCaseRequirementMaterialization(
      [{ id: "registry-v2", req_code: "TEST-01", trigger_cond: "always" }],
      [{ id: "case-row", requirementId: "registry-v1", reqCode: "TEST-01", status: "pending", triggerCond: "if_arrest_hx" }],
      { hasArrestHistory: false }
    )
    expect(plan.inserts).toHaveLength(0)
    expect(plan.updates).toEqual([{ id: "case-row", status: "na" }])
  })
})
