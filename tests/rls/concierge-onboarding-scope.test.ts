/**
 * CONCIERGE Phase 2 — the new onboarding tables (case_agreements, intro_calls)
 * are the applicant's OWN records: they may read and write them on their own
 * case, and NO other client — and no instructor — may see them. These are the
 * negative RLS tests proving the case_visible() gating holds both ways.
 *
 * Runs after `pnpm db:reset && pnpm seed`; skips when no local Supabase answers.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { adminClient, anonClientFor, supabaseReachable } from "../helpers/supabase"

const reachable = await supabaseReachable()
type DB = SupabaseClient<Database>

describe.skipIf(!reachable)("concierge onboarding tables are client-own + staff-only", () => {
  const admin = adminClient()
  let clientA: DB
  let clientB: DB
  let instructor: DB
  let staff: DB
  let adminUser: DB

  let caseId: string
  let agreementId: string
  const cleanup = { case: "" }

  beforeAll(async () => {
    ;[clientA, clientB, instructor, staff, adminUser] = await Promise.all([
      anonClientFor("client1@carrypath.test"),
      anonClientFor("client2@carrypath.test"),
      anonClientFor("instructor@carrypath.test"),
      anonClientFor("staff@carrypath.test"),
      anonClientFor("admin@carrypath.test"),
    ])

    const { data: c1 } = await admin
      .from("clients")
      .select("id")
      .eq("email", "client1@carrypath.test")
      .single()

    const { data: kase } = await admin
      .from("cases")
      .insert({ client_id: c1!.id, stage: "document_collection", is_renewal: false, service_mode: "concierge" })
      .select("id")
      .single()
    caseId = kase!.id
    cleanup.case = caseId
  })

  afterAll(async () => {
    if (cleanup.case) await admin.from("cases").delete().eq("id", cleanup.case)
  })

  it("the owning client CAN sign an agreement on their own case", async () => {
    const { data, error } = await clientA
      .from("case_agreements")
      .insert({ case_id: caseId, kind: "engagement_limited_scope", version: 1, signer_name: "Client A" })
      .select("id")
      .single()
    expect(error, error?.message).toBeNull()
    agreementId = data!.id
  })

  it("the owning client CAN request their intro call", async () => {
    const { error } = await clientA
      .from("intro_calls")
      .upsert({ case_id: caseId, provider: "calendly", status: "requested" }, { onConflict: "case_id" })
    expect(error, error?.message).toBeNull()
  })

  it("another client CANNOT read the agreement", async () => {
    const { data } = await clientB.from("case_agreements").select("id").eq("id", agreementId)
    expect(data ?? []).toHaveLength(0)
  })

  it("another client CANNOT read the intro call", async () => {
    const { data } = await clientB.from("intro_calls").select("case_id").eq("case_id", caseId)
    expect(data ?? []).toHaveLength(0)
  })

  it("another client CANNOT forge an agreement onto someone else's case", async () => {
    const { error } = await clientB
      .from("case_agreements")
      .insert({ case_id: caseId, kind: "no_guarantee_ack", version: 1, signer_name: "Intruder" })
    expect(error, "insert onto a non-owned case must be rejected").not.toBeNull()
  })

  it("an instructor CANNOT read the agreement or the intro call", async () => {
    const { data: ag } = await instructor.from("case_agreements").select("id").eq("id", agreementId)
    expect(ag ?? []).toHaveLength(0)
    const { data: ic } = await instructor.from("intro_calls").select("case_id").eq("case_id", caseId)
    expect(ic ?? []).toHaveLength(0)
  })

  it("staff CAN see both (they operate the case)", async () => {
    const { data: ag } = await staff.from("case_agreements").select("id").eq("id", agreementId)
    expect(ag ?? []).toHaveLength(1)
    const { data: ic } = await staff.from("intro_calls").select("case_id").eq("case_id", caseId)
    expect(ic ?? []).toHaveLength(1)
  })

  // ── Phase 8: the concierge-agent marker is admin-set only ──────────────────
  it("a staff member cannot self-promote to concierge agent (guard trigger)", async () => {
    const staffUid = (await staff.auth.getUser()).data.user!.id
    // profiles_update lets them touch their OWN row, but guard_profile_role()
    // freezes is_concierge_agent for non-admins.
    const { error } = await staff.from("profiles").update({ is_concierge_agent: true }).eq("id", staffUid)
    expect(error, "guard must reject a non-admin flipping the flag").not.toBeNull()
    const { data } = await admin.from("profiles").select("is_concierge_agent").eq("id", staffUid).single()
    expect(data!.is_concierge_agent, "flag stays false").toBe(false)
  })

  it("an admin CAN set a staff member's concierge-agent flag", async () => {
    const staffUid = (await staff.auth.getUser()).data.user!.id
    const { error } = await adminUser.from("profiles").update({ is_concierge_agent: true }).eq("id", staffUid)
    expect(error, error?.message).toBeNull()
    const { data } = await admin.from("profiles").select("is_concierge_agent").eq("id", staffUid).single()
    expect(data!.is_concierge_agent).toBe(true)
    await admin.from("profiles").update({ is_concierge_agent: false }).eq("id", staffUid) // reset
  })

  // ── Phase 8 SAFETY: the flag is roster-only; it must NOT widen instructor access.
  it("marking a TRAINER as concierge-agent does not widen their access (firewall holds)", async () => {
    const instrUid = (await instructor.auth.getUser()).data.user!.id
    await admin.from("profiles").update({ is_concierge_agent: true }).eq("id", instrUid)
    // Seed the classic firewall targets on the concierge case.
    await admin.from("case_notes").insert({ case_id: caseId, body: "staff-only note" })
    await admin.from("disclosures").insert({ case_id: caseId, type: "arrest", narrative: "sensitive" })

    // With the flag set, the trainer STILL sees none of it.
    const { data: ag } = await instructor.from("case_agreements").select("id").eq("case_id", caseId)
    expect(ag ?? [], "agreements still hidden").toHaveLength(0)
    const { data: notes } = await instructor.from("case_notes").select("id").eq("case_id", caseId)
    expect(notes ?? [], "notes still hidden").toHaveLength(0)
    const { data: disc } = await instructor.from("disclosures").select("id").eq("case_id", caseId)
    expect(disc ?? [], "disclosures still hidden").toHaveLength(0)

    await admin.from("profiles").update({ is_concierge_agent: false }).eq("id", instrUid) // reset
  })
})
