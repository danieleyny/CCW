/**
 * V4-A1d — the CP-5 gate is the one thing we market, so every blocker path and
 * every historical bypass is pinned here. Runs against a local Supabase seeded
 * with `pnpm seed`; skips cleanly (see helpers/supabase) when none is running.
 *
 * Each test builds a case with a CONTROLLED, minimal set of case_requirements
 * (the gate only reads this case's rows) so assertions are exact.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { evaluatePreFilingGate } from "@/lib/qa-gate"
import { stageIndex, STAGE_KEYS } from "@/config/stages"
import { adminClient, pngWithDimensions, supabaseReachable } from "./helpers/supabase"

const reachable = await supabaseReachable()

describe.skipIf(!reachable)("CP-5 pre-filing gate (lib/qa-gate)", () => {
  const admin: SupabaseClient<Database> = adminClient()
  const cleanupCases: string[] = []
  const cleanupClients: string[] = []
  const cleanupStorage: string[] = []
  let reqIds: Record<string, string> = {}
  let signOffBy: string

  beforeAll(async () => {
    const { data: reqs } = await admin
      .from("requirements")
      .select("id, req_code, blocking")
      .in("req_code", ["IDN-04", "TRN-01"])
      .is("effective_to", null)
    reqIds = Object.fromEntries((reqs ?? []).map((r) => [r.req_code, r.id]))
    // A real staff profile id to record as the sign-off actor.
    const { data: staff } = await admin.from("profiles").select("id").eq("role", "staff").limit(1).single()
    signOffBy = staff!.id
  })

  afterAll(async () => {
    if (cleanupStorage.length) await admin.storage.from("documents").remove(cleanupStorage)
    for (const id of cleanupCases) await admin.from("cases").delete().eq("id", id)
    for (const id of cleanupClients) await admin.from("clients").delete().eq("id", id)
  })

  /** Make a bare case; caller adds requirements/disclosures/refs per scenario. */
  async function makeCase(
    overrides: Partial<Database["public"]["Tables"]["cases"]["Row"]> = {}
  ): Promise<{ caseId: string; clientId: string }> {
    const { data: client } = await admin
      .from("clients")
      .insert({
        full_name: "Gate Test",
        email: `gate-${crypto.randomUUID()}@test.local`,
        track: "resident",
        license_type: "Concealed Carry",
      })
      .select("id")
      .single()
    const clientId = client!.id
    cleanupClients.push(clientId)
    const { data: kase } = await admin
      .from("cases")
      .insert({ client_id: clientId, stage: "document_collection", is_renewal: false, ...overrides })
      .select("id")
      .single()
    cleanupCases.push(kase!.id)
    return { caseId: kase!.id, clientId }
  }

  async function addReq(caseId: string, code: "IDN-04" | "TRN-01", status: string) {
    await admin.from("case_requirements").insert({
      case_id: caseId,
      requirement_id: reqIds[code],
      req_code: code,
      status: status as Database["public"]["Enums"]["case_req_status"],
    })
  }

  it("a PENDING blocking requirement blocks", async () => {
    const { caseId } = await makeCase({ qa_signed_off_by: signOffBy })
    await addReq(caseId, "IDN-04", "pending")
    const gate = await evaluatePreFilingGate(admin, caseId)
    expect(gate.ok).toBe(false)
    expect(gate.blockers.map((b) => b.kind)).toContain("blocking_requirements")
  })

  it("a REJECTED blocking requirement also blocks (the old escape)", async () => {
    const { caseId } = await makeCase({ qa_signed_off_by: signOffBy })
    await addReq(caseId, "IDN-04", "rejected")
    const gate = await evaluatePreFilingGate(admin, caseId)
    expect(gate.blockers.map((b) => b.kind)).toContain("blocking_requirements")
  })

  it("an N/A blocking requirement does NOT block (legitimately inapplicable)", async () => {
    const { caseId } = await makeCase({ qa_signed_off_by: signOffBy })
    await addReq(caseId, "IDN-04", "na")
    const gate = await evaluatePreFilingGate(admin, caseId)
    expect(gate.blockers.map((b) => b.kind)).not.toContain("blocking_requirements")
  })

  it("a short disclosure narrative blocks; a substantive one clears", async () => {
    const { caseId } = await makeCase({ qa_signed_off_by: signOffBy })
    const { data: d } = await admin
      .from("disclosures")
      .insert({ case_id: caseId, type: "arrest", disposition: "dismissed", narrative: "too short" })
      .select("id")
      .single()
    let gate = await evaluatePreFilingGate(admin, caseId)
    expect(gate.blockers.map((b) => b.kind)).toContain("disclosure_narratives")
    await admin
      .from("disclosures")
      .update({ narrative: "Dismissed under CPL 160.50; here is the full context of what happened and why." })
      .eq("id", d!.id)
    gate = await evaluatePreFilingGate(admin, caseId)
    expect(gate.blockers.map((b) => b.kind)).not.toContain("disclosure_narratives")
  })

  it("missing training blocks when a training requirement applies", async () => {
    const { caseId } = await makeCase({ qa_signed_off_by: signOffBy, training_expires_on: null })
    await addReq(caseId, "TRN-01", "satisfied")
    const gate = await evaluatePreFilingGate(admin, caseId)
    expect(gate.blockers.map((b) => b.kind)).toContain("training_missing")
  })

  it("expired training blocks", async () => {
    const { caseId } = await makeCase({ qa_signed_off_by: signOffBy, training_expires_on: "2020-01-01" })
    await addReq(caseId, "TRN-01", "satisfied")
    const gate = await evaluatePreFilingGate(admin, caseId)
    expect(gate.blockers.map((b) => b.kind)).toContain("training_expired")
  })

  it("too few notarized references blocks for a carry track", async () => {
    const { caseId } = await makeCase({ qa_signed_off_by: signOffBy })
    await admin.from("intake_sessions").insert({ case_id: caseId, answers: {} })
    const gate = await evaluatePreFilingGate(admin, caseId)
    expect(gate.blockers.map((b) => b.kind)).toContain("references_short")
  })

  it("an off-spec application photo blocks; an in-spec one clears", async () => {
    const { caseId, clientId } = await makeCase({ qa_signed_off_by: signOffBy })
    await addReq(caseId, "IDN-04", "satisfied") // applies → photo checked
    const path = `clients/${clientId}/photo-${caseId}.png`
    cleanupStorage.push(path)

    // 500×400: not square and too small → photo_spec blocker.
    await admin.storage.from("documents").upload(path, pngWithDimensions(500, 400), {
      contentType: "image/png",
      upsert: true,
    })
    await admin
      .from("documents")
      .insert({ case_id: caseId, client_id: clientId, type: "applicant_photo", file_path: path, file_name: "photo.png", status: "pending" })
    let gate = await evaluatePreFilingGate(admin, caseId)
    expect(gate.blockers.map((b) => b.kind)).toContain("photo_spec")

    // Replace bytes with a spec-compliant 800×800 square → clears.
    await admin.storage.from("documents").upload(path, pngWithDimensions(800, 800), {
      contentType: "image/png",
      upsert: true,
    })
    gate = await evaluatePreFilingGate(admin, caseId)
    expect(gate.blockers.map((b) => b.kind)).not.toContain("photo_spec")
  })

  it("missing sign-off blocks even when everything else is clean", async () => {
    // Renewal → 0 references required, so nothing but the sign-off is open.
    const { caseId } = await makeCase({ qa_signed_off_by: null, is_renewal: true })
    const gate = await evaluatePreFilingGate(admin, caseId)
    expect(gate.readyForSignOff).toBe(true) // nothing else wrong
    expect(gate.ok).toBe(false)
    expect(gate.blockers.map((b) => b.kind)).toEqual(["sign_off_missing"])
  })

  it("a clean, signed-off case with no open work passes", async () => {
    const { caseId } = await makeCase({ qa_signed_off_by: signOffBy, is_renewal: true })
    await admin.from("intake_sessions").insert({ case_id: caseId, answers: {} }) // renewal → 0 refs
    await addReq(caseId, "IDN-04", "na")
    const gate = await evaluatePreFilingGate(admin, caseId)
    expect(gate.blockers).toEqual([])
    expect(gate.ok).toBe(true)
  })

  it("gate-on-index closes the post-`filed` bypass", () => {
    // Every stage from application_assembled onward must be gated. This is the
    // invariant setCaseStage now relies on (stageIndex(target) >= assembled).
    const assembled = stageIndex("application_assembled")
    const gatedFromHere = STAGE_KEYS.filter((s) => stageIndex(s) >= assembled)
    expect(gatedFromHere).toContain("filed")
    expect(gatedFromHere).toContain("licensed")
    expect(gatedFromHere).toContain("decision")
    // Pre-assembly stages stay ungated.
    expect(stageIndex("document_collection")).toBeLessThan(assembled)
  })
})
