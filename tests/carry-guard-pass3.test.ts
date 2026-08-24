/**
 * Carry Guard — Pass 3 de-scope + citations (3A/3B), against the seeded registry.
 * A resolved armed-guard case drops the safe photos, the social-media list, the
 * 16+2 course and the two extra references; a concealed-carry case keeps them.
 */
import { describe, expect, it } from "vitest"
import { adminClient, supabaseReachable } from "./helpers/supabase"
import { generateCaseRequirements, type IntakeAnswers } from "@/lib/requirements/generate"

const reachable = await supabaseReachable()
const admin = adminClient()

async function activeNycRequirements() {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await admin
    .from("requirements")
    .select("id, req_code, trigger_cond, authority, jurisdiction_profiles!inner(key)")
    .eq("jurisdiction_profiles.key", "nyc")
    .lte("effective_from", today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
  return (data ?? []).map((r) => ({ id: r.id, req_code: r.req_code, trigger_cond: r.trigger_cond, authority: r.authority }))
}

describe.skipIf(!reachable)("Pass 3 — de-scope on the armed-guard track", () => {
  it("a carry_guard case drops SAF-01, SOC-01, REF-01, TRN-01 and keeps REF-02 (2 refs)", async () => {
    const rows = await activeNycRequirements()
    const armed: IntakeAnswers = { isCarry: true, isArmedGuard: true, isRenewal: false }
    const applies = new Map(generateCaseRequirements(rows, armed).map((g) => [g.reqCode, g.applies]))

    expect(applies.get("SAF-01")).toBe(false) // safe photos dropped on this track
    expect(applies.get("SOC-01")).toBe(false) // social-media list excluded
    expect(applies.get("REF-01")).toBe(false) // the 4-reference item does not fire
    expect(applies.get("TRN-01")).toBe(false) // 16+2 concealed-carry course excluded
    expect(applies.get("REF-02")).toBe(true) // exactly the base two references
    expect(applies.get("GRD-01")).toBe(true) // armed-guard credential DOES fire
  })

  it("a concealed-carry case STILL requires SAF-01 and REF-01 (unchanged)", async () => {
    const rows = await activeNycRequirements()
    const concealed: IntakeAnswers = { isCarry: true, isArmedGuard: false, isRenewal: false }
    const applies = new Map(generateCaseRequirements(rows, concealed).map((g) => [g.reqCode, g.applies]))

    expect(applies.get("SAF-01")).toBe(true) // safe photos still required off the armed track
    expect(applies.get("REF-01")).toBe(true) // four references
    expect(applies.get("GRD-01")).toBe(false) // no armed-guard credential
  })

  it("SPN citations carry §5-04 / §5-06 on the active versions (3A)", async () => {
    const { data } = await admin
      .from("requirements")
      .select("req_code, authority")
      .in("req_code", ["SPN-02", "SPN-04", "SPN-05", "SPN-06"])
      .is("effective_to", null)
    const byCode = new Map((data ?? []).map((r) => [r.req_code, r.authority ?? ""]))
    expect(byCode.get("SPN-02")).toContain("§5-04")
    expect(byCode.get("SPN-04")).toContain("§5-04")
    expect(byCode.get("SPN-06")).toContain("§5-04")
    expect(byCode.get("SPN-05")).toContain("§5-06")
  })
})
