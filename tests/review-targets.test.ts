/**
 * CONCIERGE QA Phase 1 — a reviewed document resolves EVERY requirement it's
 * evidence for, not just its own req_code. Pure tests of resolveReviewTargets +
 * an end-to-end DB proof that approving a passport satisfies IDN-01/02/03 (and a
 * license satisfies only IDN-01/02, leaving IDN-03 untouched).
 */
import { afterAll, describe, expect, it } from "vitest"
import { resolveReviewTargets } from "@/lib/requirements/review-targets"
import { smartDocument } from "@/lib/requirements/smart-documents"
import { materializeCaseRequirements } from "@/lib/requirements/materialize"
import { adminClient, supabaseReachable } from "./helpers/supabase"

const reachable = await supabaseReachable()

describe("resolveReviewTargets", () => {
  const row = (id: string, req_code: string, status = "pending") => ({ id, status, req_code })

  it("unions bound + target and dedupes by id (passport → 3)", () => {
    const bound = [row("a", "IDN-01"), row("b", "IDN-02"), row("c", "IDN-03")]
    const target = [row("a", "IDN-01")] // doc.req_code
    expect(resolveReviewTargets(bound, target).map((r) => r.req_code).sort()).toEqual([
      "IDN-01",
      "IDN-02",
      "IDN-03",
    ])
  })

  it("license binds only two (IDN-03 never appears)", () => {
    const bound = [row("a", "IDN-01"), row("b", "IDN-02")]
    expect(resolveReviewTargets(bound, [row("a", "IDN-01")]).map((r) => r.req_code).sort()).toEqual([
      "IDN-01",
      "IDN-02",
    ])
  })

  it("skips 'na' rows", () => {
    const bound = [row("a", "IDN-01"), row("b", "IDN-02", "na")]
    expect(resolveReviewTargets(bound, []).map((r) => r.req_code)).toEqual(["IDN-01"])
  })

  it("legacy doc with no bound rows falls back to the target req_code", () => {
    expect(resolveReviewTargets([], [row("z", "RES-01")]).map((r) => r.req_code)).toEqual(["RES-01"])
  })
})

describe.skipIf(!reachable)("document review fan-out (end-to-end)", () => {
  const admin = adminClient()
  const cleanup: string[] = []

  async function makeCase(): Promise<string> {
    const { data: client } = await admin
      .from("clients")
      .insert({ full_name: "Fan Out", email: `fanout_${Math.random().toString(36).slice(2)}@test.local`, track: "resident", current_stage: "lead" })
      .select("id")
      .single()
    const { data: kase } = await admin
      .from("cases")
      .insert({ client_id: client!.id, stage: "document_collection", status: "active" })
      .select("id")
      .single()
    cleanup.push(kase!.id)
    await materializeCaseRequirements(admin, kase!.id, "nyc", { isCarry: true })
    return kase!.id
  }

  // Replicates reviewDocument's resolution + apply, using the SAME helper, so the
  // DB round-trip (bind at upload → resolve by document_id → satisfy) is proven.
  async function uploadBindApprove(caseId: string, kind: string) {
    const { data: client } = await admin.from("cases").select("client_id").eq("id", caseId).single()
    const { data: doc } = await admin
      .from("documents")
      .insert({ case_id: caseId, client_id: client!.client_id, type: "id", file_name: "id.png", status: "pending", req_code: "IDN-01" })
      .select("id")
      .single()
    // Upload-time smart fan-out: bind document_id across the kind's covered reqs.
    const reqCodes = smartDocument(kind)!.reqCodes
    await admin.from("case_requirements").update({ document_id: doc!.id }).eq("case_id", caseId).in("req_code", reqCodes)
    // Review-time resolution (mirrors reviewDocument).
    const { data: bound } = await admin.from("case_requirements").select("id, status, req_code").eq("case_id", caseId).eq("document_id", doc!.id)
    const { data: target } = await admin.from("case_requirements").select("id, status, req_code").eq("case_id", caseId).eq("req_code", "IDN-01")
    const resolved = resolveReviewTargets(bound ?? [], target ?? [])
    for (const r of resolved) {
      await admin.from("case_requirements").update({ status: "satisfied", document_id: doc!.id }).eq("id", r.id)
    }
    return doc!.id
  }

  async function statusOf(caseId: string, reqCode: string) {
    const { data } = await admin.from("case_requirements").select("status, document_id").eq("case_id", caseId).eq("req_code", reqCode).maybeSingle()
    return data
  }

  afterAll(async () => {
    for (const id of cleanup) await admin.from("cases").delete().eq("id", id)
  })

  it("approving a passport satisfies IDN-01, IDN-02, AND IDN-03 — all bound to it", async () => {
    const caseId = await makeCase()
    const docId = await uploadBindApprove(caseId, "us_passport")
    for (const code of ["IDN-01", "IDN-02", "IDN-03"]) {
      const s = await statusOf(caseId, code)
      expect(s?.status, `${code} satisfied`).toBe("satisfied")
      expect(s?.document_id, `${code} bound to the passport`).toBe(docId)
    }
  })

  it("approving a driver's license satisfies IDN-01/02 only, leaving IDN-03 pending", async () => {
    const caseId = await makeCase()
    await uploadBindApprove(caseId, "drivers_license_or_state_id")
    expect((await statusOf(caseId, "IDN-01"))?.status).toBe("satisfied")
    expect((await statusOf(caseId, "IDN-02"))?.status).toBe("satisfied")
    expect((await statusOf(caseId, "IDN-03"))?.status, "citizenship NOT covered by a license").toBe("pending")
  })
})
