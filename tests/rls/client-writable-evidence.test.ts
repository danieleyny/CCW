/**
 * Security Wave 1 — the applicant may write evidence CONTENT but never its
 * VERIFICATION STATE. These are the negative tests for the column-guard triggers
 * in 20260802000100: they sign in as a real applicant (client1) and try, via the
 * data API (the same surface a raw anon-key PostgREST call would hit), to forge
 * the flags that gate a case toward filing. Every attempt must be neutralised.
 *
 * Covers SEC-02 (character_references.notarized/received),
 * SEC-03 (documents review state), SEC-13 (cohabitants.affidavit_status),
 * SEC-20 (signatures signer_key), SEC-04 (activity_log actor forgery),
 * SEC-08 (DB backstop for the CP-5 pre-filing sign-off).
 *
 * Runs after `pnpm db:reset && pnpm seed`; skips when no local Supabase answers.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { adminClient, anonClientFor, supabaseReachable } from "../helpers/supabase"

const reachable = await supabaseReachable()
type DB = SupabaseClient<Database>

describe.skipIf(!reachable)("applicant cannot write verification state", () => {
  const admin = adminClient()
  let clientA: DB
  let adminUser: DB
  let clientAUid: string
  let otherUid: string

  let caseId: string
  let clientAId: string
  let refId: string
  let cohabId: string
  let docId: string
  const cleanup = { case: "" }

  beforeAll(async () => {
    ;[clientA, adminUser] = await Promise.all([
      anonClientFor("client1@carrypath.test"),
      anonClientFor("admin@carrypath.test"),
    ])
    clientAUid = (await clientA.auth.getUser()).data.user!.id
    otherUid = (await adminUser.auth.getUser()).data.user!.id

    const { data: c1 } = await admin.from("clients").select("id").eq("email", "client1@carrypath.test").single()
    clientAId = c1!.id

    // Fixture case + one already-verified row per guarded table, written by the
    // service role (the legitimate privileged writer) so we can prove the
    // applicant cannot FLIP an established flag, not merely that they cannot set
    // it from scratch.
    const { data: kase } = await admin
      .from("cases")
      .insert({ client_id: clientAId, stage: "document_collection", is_renewal: false })
      .select("id")
      .single()
    caseId = kase!.id
    cleanup.case = caseId

    const { data: ref } = await admin
      .from("character_references")
      .insert({ case_id: caseId, name: "Ref Person", contact_email: "ref@test.local", notarized: true, received: true })
      .select("id")
      .single()
    refId = ref!.id

    const { data: cohab } = await admin
      .from("cohabitants")
      .insert({ case_id: caseId, name: "Room Mate", affidavit_status: "notarized" })
      .select("id")
      .single()
    cohabId = cohab!.id

    const { data: doc } = await admin
      .from("documents")
      .insert({ case_id: caseId, client_id: clientAId, type: "id", file_name: "id.png", status: "approved", notarized: true })
      .select("id")
      .single()
    docId = doc!.id
  })

  afterAll(async () => {
    if (cleanup.case) await admin.from("cases").delete().eq("id", cleanup.case)
  })

  // ── SEC-02 · character_references ──────────────────────────────────────────
  it("cannot flip a reference's notarized/received flags", async () => {
    const { error } = await clientA
      .from("character_references")
      .update({ notarized: false, received: false, name: "Renamed OK" })
      .eq("id", refId)
    // The write itself is allowed (they own the row + may edit the name)…
    expect(error, error?.message).toBeNull()
    // …but the proof flags are frozen by the trigger.
    const { data } = await admin.from("character_references").select("notarized, received, name").eq("id", refId).single()
    expect(data!.notarized, "notarized must stay true").toBe(true)
    expect(data!.received, "received must stay true").toBe(true)
    expect(data!.name, "identity fields DO update").toBe("Renamed OK")
  })

  it("a self-inserted reference is never born notarized", async () => {
    const { data } = await clientA
      .from("character_references")
      .insert({ case_id: caseId, name: "DIY", notarized: true, received: true })
      .select("id, notarized, received")
      .single()
    expect(data!.notarized).toBe(false)
    expect(data!.received).toBe(false)
    await admin.from("character_references").delete().eq("id", data!.id)
  })

  // ── SEC-03 · documents review state ────────────────────────────────────────
  it("cannot self-approve or self-notarize a document (insert)", async () => {
    const { data } = await clientA
      .from("documents")
      .insert({ case_id: caseId, client_id: clientAId, type: "proof_residence", file_name: "x.png", status: "approved", notarized: true })
      .select("id, status, notarized, reviewer")
      .single()
    expect(data!.status).toBe("pending")
    expect(data!.notarized).toBe(false)
    expect(data!.reviewer).toBeNull()
    await admin.from("documents").delete().eq("id", data!.id)
  })

  it("cannot approve an existing document (update)", async () => {
    await clientA.from("documents").update({ status: "approved", notarized: true, review_notes: "trust me" }).eq("id", docId)
    const { data } = await admin.from("documents").select("status, notarized, review_notes").eq("id", docId).single()
    expect(data!.status).toBe("approved") // unchanged from the seeded-approved fixture
    expect(data!.notarized).toBe(true) // frozen — not the applicant's doing
    expect(data!.review_notes).toBeNull() // the applicant's note never lands
  })

  // ── SEC-13 · cohabitants ───────────────────────────────────────────────────
  it("cannot advance a cohabitant affidavit_status", async () => {
    // Seed one as not_started, then try to jump it to notarized.
    const { data: fresh } = await clientA
      .from("cohabitants")
      .insert({ case_id: caseId, name: "New Roomie", affidavit_status: "notarized" })
      .select("id, affidavit_status")
      .single()
    expect(fresh!.affidavit_status, "insert forced to not_started").toBe("not_started")
    await clientA.from("cohabitants").update({ affidavit_status: "notarized" }).eq("id", fresh!.id)
    const { data } = await admin.from("cohabitants").select("affidavit_status").eq("id", fresh!.id).single()
    expect(data!.affidavit_status, "update frozen").toBe("not_started")
    await admin.from("cohabitants").delete().eq("id", fresh!.id)
    // The service-role-notarized fixture is likewise untouchable.
    await clientA.from("cohabitants").update({ affidavit_status: "received" }).eq("id", cohabId)
    const { data: fixture } = await admin.from("cohabitants").select("affidavit_status").eq("id", cohabId).single()
    expect(fixture!.affidavit_status).toBe("notarized")
  })

  // ── SEC-20 · signatures ────────────────────────────────────────────────────
  it("cannot forge a reference/cohabitant signature", async () => {
    const { error } = await clientA
      .from("signatures")
      .upsert({ case_id: caseId, signer_key: `reference:${refId}`, png_base64: "Zm9yZ2Vk" }, { onConflict: "case_id,signer_key" })
    expect(error, "a non-applicant signer_key must be rejected").not.toBeNull()
  })

  it("CAN still write its own applicant signature", async () => {
    const { error } = await clientA
      .from("signatures")
      .upsert({ case_id: caseId, signer_key: "applicant", png_base64: "bWluZQ==" }, { onConflict: "case_id,signer_key" })
    expect(error, error?.message).toBeNull()
  })

  // ── SEC-04 · activity_log actor binding ────────────────────────────────────
  it("cannot forge the actor on an audit-log row", async () => {
    const { error } = await clientA
      .from("activity_log")
      .insert({ actor: otherUid, action: "case.tampered", case_id: caseId })
    expect(error, "actor≠auth.uid() must be rejected").not.toBeNull()
  })

  it("CAN log an action attributed to itself", async () => {
    const { error } = await clientA
      .from("activity_log")
      .insert({ actor: clientAUid, action: "document.uploaded", case_id: caseId })
    expect(error, error?.message).toBeNull()
  })

  // ── SEC-08 · DB backstop for the CP-5 sign-off ─────────────────────────────
  it("a case cannot reach a filing stage without a recorded QA sign-off", async () => {
    // admin session (authenticated) — the recordLicenseIssued / raw-update path.
    const blocked = await adminUser.from("cases").update({ stage: "filed" }).eq("id", caseId)
    expect(blocked.error, "no sign-off → blocked at the DB").not.toBeNull()

    const ok = await adminUser.from("cases").update({ qa_signed_off_by: otherUid, stage: "filed" }).eq("id", caseId)
    expect(ok.error, ok.error?.message).toBeNull()
  })
})
