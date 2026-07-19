/**
 * THE ACCEPTANCE GATE for trainer-as-concierge.
 *
 * A trainer is a third party we let near somebody's firearms-licence file. This
 * suite is the proof that the database itself refuses the things it must
 * refuse — not the UI, which is only as good as its last refactor.
 *
 * Everything runs WITH AN ACTIVE ENGAGEMENT in place. That matters: the older
 * `matrix.test.ts` creates its engagement mid-suite, so its instructor
 * assertions actually prove "a NON-engaged instructor sees nothing", which is a
 * much weaker claim than the one this feature needs.
 *
 * Every assertion runs for BOTH trust tiers via a loop, so adding a tier can't
 * silently skip coverage.
 *
 * Two habits worth copying:
 *  - After an UPDATE attempt, RE-READ with the service role. PostgREST returns
 *    success-with-zero-rows when RLS filters an update, so "no error" is not a
 *    pass.
 *  - Assert redaction at KEY level (`Object.keys`), not value level. A column
 *    that is null today is a populated column tomorrow.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { adminClient, anonClientFor, supabaseReachable, DEMO_PASSWORD } from "../helpers/supabase"

type DB = SupabaseClient<Database>

const reachable = await supabaseReachable()
const admin = adminClient()

const TIERS = ["partner", "staff"] as const
const EMAIL = (tier: string) => `trainer-${tier}@carrypath.test`

/** Fixtures, built once and shared by both tier loops. */
let caseId = ""
let clientId = ""
let otherCaseId = ""
const trainers: Record<string, { client: DB; instructorId: string; userId: string; engagementId: string }> = {}
let safeReqId = ""
let idDocId = ""
let arrestDocId = ""

async function makeTrainer(tier: string) {
  const email = EMAIL(tier)
  const { data: created } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `Trainer ${tier}`, role: "instructor" },
  })
  const userId = created.user!.id
  await admin.from("profiles").upsert({ id: userId, full_name: `Trainer ${tier}`, role: "instructor" })

  const { data: instr } = await admin
    .from("instructors")
    .insert({
      name: `Trainer ${tier}`,
      email,
      profile_id: userId,
      verified: true,
      trust_tier: tier,
      jurisdictions: ["nyc"],
    })
    .select("id")
    .single()

  const { data: eng } = await admin
    .from("engagements")
    .insert({ case_id: caseId, instructor_id: instr!.id, type: "full_assist", status: "active" })
    .select("id")
    .single()

  return {
    client: await anonClientFor(email),
    instructorId: instr!.id,
    userId,
    engagementId: eng!.id,
  }
}

describe.skipIf(!reachable)("trainer scope — the firewall", () => {
  beforeAll(async () => {
    const { data: c } = await admin
      .from("clients")
      .select("id")
      .eq("email", "client1@carrypath.test")
      .single()
    clientId = c!.id

    const { data: k } = await admin
      .from("cases")
      .insert({ client_id: clientId, stage: "document_collection" })
      .select("id")
      .single()
    caseId = k!.id

    const { data: other } = await admin
      .from("cases")
      .insert({ client_id: clientId, stage: "lead" })
      .select("id")
      .single()
    otherCaseId = other!.id

    // A hidden requirement (ARR-01) and a full one (IDN-01), each with a bound
    // document — so "can they see the arrest document" is a real question.
    const { data: reqs } = await admin
      .from("requirements")
      .select("id, req_code")
      .in("req_code", ["ARR-01", "IDN-01"])
      .is("effective_to", null)
    const arrestReq = reqs!.find((r) => r.req_code === "ARR-01")!
    const idReq = reqs!.find((r) => r.req_code === "IDN-01")!

    const { data: arrestDoc } = await admin
      .from("documents")
      .insert({
        case_id: caseId,
        client_id: clientId,
        type: "arrest_statement",
        req_code: "ARR-01",
        file_name: "arrest-statement.pdf",
        file_path: `clients/${clientId}/probe/arrest-statement.pdf`,
        status: "pending",
      })
      .select("id")
      .single()
    arrestDocId = arrestDoc!.id

    const { data: idDoc } = await admin
      .from("documents")
      .insert({
        case_id: caseId,
        client_id: clientId,
        type: "id",
        req_code: "IDN-01",
        file_name: "drivers-licence.jpg",
        file_path: `clients/${clientId}/probe/drivers-licence.jpg`,
        status: "pending",
      })
      .select("id")
      .single()
    idDocId = idDoc!.id

    const { data: cr } = await admin
      .from("case_requirements")
      .insert([
        {
          case_id: caseId,
          requirement_id: arrestReq.id,
          req_code: "ARR-01",
          status: "pending",
          document_id: arrestDocId,
          notes: "STAFF ONLY: applicant's 2014 Kings County matter, sealed.",
        },
        {
          case_id: caseId,
          requirement_id: idReq.id,
          req_code: "IDN-01",
          status: "pending",
          document_id: idDocId,
          notes: "OVERRIDE: staff prose that must never reach a trainer",
        },
      ])
      .select("id, req_code")
    safeReqId = cr!.find((r) => r.req_code === "IDN-01")!.id

    await admin.from("disclosures").insert({
      case_id: caseId,
      type: "arrest",
      narrative: "A disclosure the trainer must never see.",
      spawned_req_code: "ARR-01",
    })

    for (const tier of TIERS) trainers[tier] = await makeTrainer(tier)
  })

  afterAll(async () => {
    for (const tier of TIERS) {
      const t = trainers[tier]
      if (!t) continue
      await admin.from("instructors").delete().eq("id", t.instructorId)
      await admin.auth.admin.deleteUser(t.userId)
    }
    if (caseId) await admin.from("cases").delete().eq("id", caseId)
    if (otherCaseId) await admin.from("cases").delete().eq("id", otherCaseId)
  })

  for (const tier of TIERS) {
    describe(`tier: ${tier}`, () => {
      const T = () => trainers[tier].client

      // ── The broad doors are gone ──────────────────────────────────────────
      it("cannot read the cases table directly", async () => {
        const { data } = await T().from("cases").select("id").eq("id", caseId)
        expect(data ?? []).toEqual([])
      })

      it("cannot read the case_requirements table directly", async () => {
        // This is what used to expose `notes` and every req_code.
        const { data } = await T().from("case_requirements").select("id").eq("case_id", caseId)
        expect(data ?? []).toEqual([])
      })

      it.each([
        "documents",
        "disclosures",
        "clients",
        "case_notes",
        "intake_sessions",
        "requirement_answers",
        "signatures",
        "signature_events",
        "cohabitants",
        "character_references",
      ])("cannot read %s", async (table) => {
        const { data } = await T()
          .from(table as "documents")
          .select("id")
          .eq(table === "clients" ? "id" : "case_id", table === "clients" ? clientId : caseId)
        expect(data ?? []).toEqual([])
      })

      it("cannot download a document from storage", async () => {
        const { error } = await T()
          .storage.from("documents")
          .download(`clients/${clientId}/probe/arrest-statement.pdf`)
        expect(error).not.toBeNull()
      })

      // ── Writes ────────────────────────────────────────────────────────────
      it("cannot update a requirement directly", async () => {
        await T().from("case_requirements").update({ status: "satisfied" }).eq("id", safeReqId)
        // Re-read with the service role: an RLS-filtered update returns success.
        const { data } = await admin
          .from("case_requirements")
          .select("status")
          .eq("id", safeReqId)
          .single()
        expect(data!.status).toBe("pending")
      })

      it("cannot update a document directly", async () => {
        await T().from("documents").update({ status: "approved" }).eq("id", idDocId)
        const { data } = await admin.from("documents").select("status").eq("id", idDocId).single()
        expect(data!.status).toBe("pending")
      })

      // ── THE assertion this whole feature turns on ─────────────────────────
      it("cannot learn that an arrest history exists", async () => {
        const { data } = await T().from("trainer_requirement_feed").select("req_code").eq("case_id", caseId)
        const codes = (data ?? []).map((r) => r.req_code)
        expect(codes).not.toContain("ARR-01")
        for (const hidden of ["DSC-01", "QUE-01", "OOP-01", "DIR-01", "GMC-01"]) {
          expect(codes, `${hidden} leaked into the trainer feed`).not.toContain(hidden)
        }
        // ...and the concierge-safe row IS there, so this isn't passing by
        // returning nothing at all.
        expect(codes).toContain("IDN-01")
      })

      it("the requirement feed carries no staff prose and no disclosure keys", async () => {
        const { data } = await T().from("trainer_requirement_feed").select("*").eq("case_id", caseId).limit(1)
        const keys = Object.keys(data?.[0] ?? {})
        expect(keys.length).toBeGreaterThan(0)
        for (const forbidden of ["notes", "disclosure_id", "reference_id", "cohabitant_id"]) {
          expect(keys, `${forbidden} is exposed`).not.toContain(forbidden)
        }
      })

      it("the case view carries identity but not internal case fields", async () => {
        const { data } = await T().from("trainer_case_scope").select("*").eq("case_id", caseId).single()
        expect(data!.applicant_name).toBeTruthy()
        expect(data!.applicant_email).toBeTruthy()
        const keys = Object.keys(data!)
        for (const forbidden of ["client_id", "qa_signed_off_by", "nypd_app_ref"]) {
          expect(keys, `${forbidden} is exposed`).not.toContain(forbidden)
        }
      })

      it("the document feed excludes disclosure documents and the file path", async () => {
        const { data } = await T().from("trainer_document_feed").select("*").eq("case_id", caseId)
        const types = (data ?? []).map((d) => d.type)
        expect(types).not.toContain("arrest_statement")
        expect(types).toContain("id")
        const keys = Object.keys(data?.[0] ?? {})
        for (const forbidden of ["file_path", "review_notes"]) {
          expect(keys, `${forbidden} is exposed`).not.toContain(forbidden)
        }
      })

      it("roster progress gives counts and no third-party identities", async () => {
        const { data } = await T().from("trainer_roster_progress").select("*").eq("case_id", caseId)
        const keys = Object.keys(data?.[0] ?? {})
        for (const forbidden of ["name", "contact_email", "address", "full_name"]) {
          expect(keys, `${forbidden} is exposed`).not.toContain(forbidden)
        }
      })

      it("the file-access predicate refuses a disclosure document", async () => {
        const { data: allowed } = await T().rpc("trainer_may_read_document", { p_document_id: idDocId })
        const { data: denied } = await T().rpc("trainer_may_read_document", { p_document_id: arrestDocId })
        expect(allowed, "a concierge-safe document should be readable").toBe(true)
        expect(denied, "an arrest statement was readable").toBe(false)
      })

      // ── The write path ────────────────────────────────────────────────────
      it("cannot review a disclosure requirement — it isn't even addressable", async () => {
        // They can't learn the id exists through any view, but a leaked or
        // guessed id must fail too: the RPC re-derives scope from the view.
        const { data: arrestCr } = await admin
          .from("case_requirements")
          .select("id")
          .eq("case_id", caseId)
          .eq("req_code", "ARR-01")
          .single()
        const { error } = await T().rpc("trainer_review_requirement", {
          p_case_requirement_id: arrestCr!.id,
          p_decision: "approved",
        })
        expect(error, "a trainer approved a disclosure requirement").not.toBeNull()
      })

      it("cannot review a progress-only item", async () => {
        const { data: refReq } = await admin
          .from("requirements")
          .select("id")
          .eq("req_code", "REF-01")
          .is("effective_to", null)
          .limit(1)
          .single()
        const { data: cr } = await admin
          .from("case_requirements")
          .upsert(
            { case_id: caseId, requirement_id: refReq!.id, req_code: "REF-01", status: "pending" },
            { onConflict: "case_id,requirement_id" }
          )
          .select("id")
          .single()
        const { error } = await T().rpc("trainer_review_requirement", {
          p_case_requirement_id: cr!.id,
          p_decision: "approved",
        })
        expect(error, "a trainer approved somebody else's notarized letter").not.toBeNull()
      })

      it("cannot request changes without saying what to fix", async () => {
        const { error } = await T().rpc("trainer_review_requirement", {
          p_case_requirement_id: safeReqId,
          p_decision: "changes_requested",
          p_note: "   ",
        })
        expect(error).not.toBeNull()
      })

      it("sees nothing on a case they hold no engagement on", async () => {
        const { data } = await T().from("trainer_case_scope").select("case_id").eq("case_id", otherCaseId)
        expect(data ?? []).toEqual([])
      })
    })
  }

  // ── The happy path, and what it must NOT touch ───────────────────────────
  it("approving satisfies the requirement and leaves staff prose byte-identical", async () => {
    const { data: before } = await admin
      .from("case_requirements")
      .select("notes")
      .eq("id", safeReqId)
      .single()

    const { error } = await trainers.partner.client.rpc("trainer_review_requirement", {
      p_case_requirement_id: safeReqId,
      p_decision: "approved",
      p_note: "Front and back are legible.",
    })
    expect(error, error?.message).toBeNull()

    const { data: after } = await admin
      .from("case_requirements")
      .select("status, notes")
      .eq("id", safeReqId)
      .single()
    expect(after!.status, "trainer approval must satisfy the requirement").toBe("satisfied")
    expect(after!.notes, "the RPC touched staff prose").toBe(before!.notes)

    const { data: review } = await admin
      .from("requirement_reviews")
      .select("decision, note, reviewer_kind")
      .eq("case_requirement_id", safeReqId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
    expect(review!.decision).toBe("approved")
    expect(review!.reviewer_kind).toBe("trainer")

    // Reset for the change-request test below.
    await admin.from("case_requirements").update({ status: "pending" }).eq("id", safeReqId)
  })

  it("requesting changes notifies the applicant on that exact item", async () => {
    const { error } = await trainers.partner.client.rpc("trainer_review_requirement", {
      p_case_requirement_id: safeReqId,
      p_decision: "changes_requested",
      p_note: "The back of the licence is cut off — can you retake it?",
    })
    expect(error, error?.message).toBeNull()

    const { data: notes } = await admin
      .from("notifications")
      .select("title, body, kind")
      .eq("case_id", caseId)
      .eq("kind", "action_required")
      .order("created_at", { ascending: false })
      .limit(1)
    expect(notes?.[0]?.body, "the applicant wasn't told what to fix").toContain("cut off")
  })

  it("a trainer cannot read a STAFF review note", async () => {
    // Staff prose can quote disclosure content, so it stays invisible even on a
    // case this trainer is legitimately working.
    const { data: staff } = await admin.from("profiles").select("id").eq("role", "staff").limit(1).single()
    const { data: row } = await admin
      .from("requirement_reviews")
      .insert({
        case_requirement_id: safeReqId,
        case_id: caseId,
        reviewer: staff!.id,
        reviewer_kind: "staff",
        decision: "changes_requested",
        note: "STAFF ONLY: relates to the 2014 arrest narrative.",
      })
      .select("id")
      .single()
    try {
      const { data } = await trainers.partner.client
        .from("requirement_reviews")
        .select("id, note")
        .eq("id", row!.id)
      expect(data ?? [], "a staff review note reached a trainer").toEqual([])
    } finally {
      await admin.from("requirement_reviews").delete().eq("id", row!.id)
    }
  })

  // ── Lifecycle: access is live state, not a grant made once ────────────────
  it("a cancelled engagement closes every view", async () => {
    const t = trainers.partner
    await admin.from("engagements").update({ status: "cancelled" }).eq("id", t.engagementId)
    try {
      for (const view of [
        "trainer_case_scope",
        "trainer_requirement_feed",
        "trainer_document_feed",
        "trainer_roster_progress",
      ] as const) {
        const { data } = await t.client.from(view).select("case_id").eq("case_id", caseId)
        expect(data ?? [], `${view} still returned rows after cancellation`).toEqual([])
      }
      const { data: mayRead } = await t.client.rpc("trainer_may_read_document", { p_document_id: idDocId })
      expect(mayRead).toBe(false)
    } finally {
      await admin.from("engagements").update({ status: "active" }).eq("id", t.engagementId)
    }
  })

  it("an unclassified requirement is invisible by default", async () => {
    const { data: sample } = await admin
      .from("requirements")
      .select("jurisdiction_id")
      .limit(1)
      .single()
    const { data: req } = await admin
      .from("requirements")
      .insert({
        req_code: "ZZZ-98",
        title: "Unclassified probe",
        jurisdiction_id: sample!.jurisdiction_id,
        severity: "watch",
        trigger_cond: "always",
      })
      .select("id")
      .single()
    const { data: cr } = await admin
      .from("case_requirements")
      .insert({ case_id: caseId, requirement_id: req!.id, req_code: "ZZZ-98", status: "pending" })
      .select("id")
      .single()
    try {
      const { data } = await trainers.partner.client
        .from("trainer_requirement_feed")
        .select("req_code")
        .eq("case_id", caseId)
      expect((data ?? []).map((r) => r.req_code)).not.toContain("ZZZ-98")
    } finally {
      await admin.from("case_requirements").delete().eq("id", cr!.id)
      await admin.from("requirements").delete().eq("id", req!.id)
    }
  })
})
