/**
 * Automatic stage advancement. The two things that must hold: a case never moves
 * backwards, and automation never reaches the stages the CP-5 gate owns.
 *
 * Runs against a throwaway case in the local DB; skips when Supabase isn't up.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { maybeAdvanceStage, AUTO_STAGES, AUTO_STAGE_CEILING } from "@/lib/cases/advance"
import { stageIndex } from "@/config/stages"
import { adminClient, supabaseReachable } from "./helpers/supabase"

const reachable = await supabaseReachable()
const admin = adminClient()
let caseId = ""

const stageOf = async () => {
  const { data } = await admin.from("cases").select("stage").eq("id", caseId).single()
  return data!.stage
}

describe.skipIf(!reachable)("maybeAdvanceStage", () => {
  beforeAll(async () => {
    const { data: client } = await admin.from("clients").select("id").limit(1).single()
    const { data } = await admin
      .from("cases")
      .insert({ client_id: client!.id, stage: "lead" })
      .select("id")
      .single()
    caseId = data!.id
  })
  afterAll(async () => {
    if (caseId) await admin.from("cases").delete().eq("id", caseId)
  })

  it("moves a lead forward on a milestone", async () => {
    const r = await maybeAdvanceStage(admin, caseId, "eligibility_screened", "intake.completed")
    expect(r.moved).toBe(true)
    expect(await stageOf()).toBe("eligibility_screened")
  })

  it("is idempotent — the same milestone twice moves nothing the second time", async () => {
    const r = await maybeAdvanceStage(admin, caseId, "eligibility_screened", "intake.completed")
    expect(r.moved).toBe(false)
    expect(await stageOf()).toBe("eligibility_screened")
  })

  it("never moves a case backwards", async () => {
    await maybeAdvanceStage(admin, caseId, "training_complete", "booking.completed")
    expect(await stageOf()).toBe("training_complete")

    // A late webhook for an earlier milestone must not undo it.
    const r = await maybeAdvanceStage(admin, caseId, "signed_up_paid", "payment.paid")
    expect(r.moved).toBe(false)
    expect(await stageOf()).toBe("training_complete")
  })

  it("refuses to reach the stages the CP-5 gate owns", async () => {
    for (const stage of ["application_assembled", "filed", "licensed"] as const) {
      await expect(maybeAdvanceStage(admin, caseId, stage, "test")).rejects.toThrow(/automation stops/)
    }
    expect(await stageOf()).toBe("training_complete")
  })

  it("leaves a case alone once staff have taken it past the ceiling", async () => {
    await admin.from("cases").update({ stage: "application_assembled" }).eq("id", caseId)
    const r = await maybeAdvanceStage(admin, caseId, "notarization", "requirement.notarized")
    expect(r.moved).toBe(false)
    expect(await stageOf()).toBe("application_assembled")
  })

  it("the allow-list stops at the ceiling, in pipeline order", () => {
    expect(AUTO_STAGES[AUTO_STAGES.length - 1]).toBe(AUTO_STAGE_CEILING)
    expect(stageIndex(AUTO_STAGE_CEILING)).toBeLessThan(stageIndex("application_assembled"))
    for (const [i, s] of AUTO_STAGES.entries()) {
      if (i > 0) expect(stageIndex(s)).toBeGreaterThan(stageIndex(AUTO_STAGES[i - 1]))
    }
  })
})
