/**
 * V4-A3 — the RLS access matrix. The security-critical invariants of this
 * product are enforced in the database, not the app, so they get a test that
 * signs in as each real seeded role and asserts allow AND deny per table.
 *
 * The privacy firewall is the point: instructors NEVER see disclosures,
 * documents, notes, intake, or client PII; one client never sees another's;
 * staff-only tables stay staff-only; the instructor offer feed is structurally
 * redacted. Runs after `pnpm db:reset && pnpm seed`; skips when no local
 * Supabase is reachable (see helpers/supabase).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { adminClient, anonClientFor, pngWithDimensions, supabaseReachable } from "../helpers/supabase"

const reachable = await supabaseReachable()

type DB = SupabaseClient<Database>

/** Count rows visible to `c` in `table`, optionally scoped to a case. */
async function count(c: DB, table: string, caseId?: string): Promise<number> {
  // Dynamic table name — step outside the generated table-literal typing.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let q: any = (c as any).from(table).select("id", { count: "exact", head: true })
  if (caseId) q = q.eq("case_id", caseId)
  const { count } = await q
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return count ?? 0
}

describe.skipIf(!reachable)("RLS access matrix", () => {
  const admin = adminClient()
  let clientA: DB // client1 — owns the fixture case
  let clientB: DB // client2 — a different applicant
  let staff: DB
  let adminUser: DB
  let instructor: DB

  let caseId: string
  let clientAId: string
  let storagePath: string
  const cleanupIds = { case: "", storage: "" }

  beforeAll(async () => {
    ;[clientA, clientB, staff, adminUser, instructor] = await Promise.all([
      anonClientFor("client1@carrypath.test"),
      anonClientFor("client2@carrypath.test"),
      anonClientFor("staff@carrypath.test"),
      anonClientFor("admin@carrypath.test"),
      anonClientFor("instructor@carrypath.test"),
    ])

    const { data: c1 } = await admin.from("clients").select("id").eq("email", "client1@carrypath.test").single()
    clientAId = c1!.id

    // A dedicated fixture case under client1 with one row in each guarded table.
    const { data: kase } = await admin
      .from("cases")
      .insert({ client_id: clientAId, stage: "document_collection", is_renewal: false })
      .select("id")
      .single()
    caseId = kase!.id
    cleanupIds.case = caseId

    await admin.from("disclosures").insert({ case_id: caseId, type: "arrest", narrative: "rls fixture" })
    await admin
      .from("documents")
      .insert({ case_id: caseId, client_id: clientAId, type: "id", file_name: "id.png", status: "pending" })
    await admin.from("case_notes").insert({ case_id: caseId, body: "staff-only fixture note" })
    await admin.from("intake_sessions").insert({ case_id: caseId, answers: {} })

    const { data: ref } = await admin
      .from("character_references")
      .insert({ case_id: caseId, name: "Ref Person", contact_email: "ref@test.local" })
      .select("id")
      .single()
    await admin.from("reference_requests").insert({ case_id: caseId, reference_id: ref!.id, token: `rls-${crypto.randomUUID()}` })

    storagePath = `clients/${clientAId}/rls-${crypto.randomUUID()}.png`
    cleanupIds.storage = storagePath
    await admin.storage.from("documents").upload(storagePath, pngWithDimensions(800, 800), {
      contentType: "image/png",
      upsert: true,
    })
  })

  afterAll(async () => {
    if (cleanupIds.storage) await admin.storage.from("documents").remove([cleanupIds.storage])
    if (cleanupIds.case) await admin.from("cases").delete().eq("id", cleanupIds.case)
  })

  it("disclosures: owner + staff + admin see; other client + instructor never", async () => {
    expect(await count(clientA, "disclosures", caseId)).toBeGreaterThan(0)
    expect(await count(staff, "disclosures", caseId)).toBeGreaterThan(0)
    expect(await count(adminUser, "disclosures", caseId)).toBeGreaterThan(0)
    expect(await count(clientB, "disclosures", caseId)).toBe(0)
    expect(await count(instructor, "disclosures", caseId)).toBe(0)
  })

  it("documents: owner + staff see; other client + instructor never", async () => {
    expect(await count(clientA, "documents", caseId)).toBeGreaterThan(0)
    expect(await count(staff, "documents", caseId)).toBeGreaterThan(0)
    expect(await count(clientB, "documents", caseId)).toBe(0)
    expect(await count(instructor, "documents", caseId)).toBe(0)
  })

  it("case_notes: staff + admin only — not the client, not the instructor", async () => {
    expect(await count(staff, "case_notes", caseId)).toBeGreaterThan(0)
    expect(await count(adminUser, "case_notes", caseId)).toBeGreaterThan(0)
    expect(await count(clientA, "case_notes", caseId)).toBe(0)
    expect(await count(instructor, "case_notes", caseId)).toBe(0)
  })

  it("intake_sessions: owner + staff see; other client + instructor never", async () => {
    expect(await count(clientA, "intake_sessions", caseId)).toBeGreaterThan(0)
    expect(await count(staff, "intake_sessions", caseId)).toBeGreaterThan(0)
    expect(await count(clientB, "intake_sessions", caseId)).toBe(0)
    expect(await count(instructor, "intake_sessions", caseId)).toBe(0)
  })

  it("reference_requests: owner + staff see; other client + instructor never", async () => {
    expect(await count(clientA, "reference_requests", caseId)).toBeGreaterThan(0)
    expect(await count(staff, "reference_requests", caseId)).toBeGreaterThan(0)
    expect(await count(clientB, "reference_requests", caseId)).toBe(0)
    expect(await count(instructor, "reference_requests", caseId)).toBe(0)
  })

  it("a client cannot write a disclosure onto another client's case", async () => {
    const { error } = await clientB
      .from("disclosures")
      .insert({ case_id: caseId, type: "arrest", narrative: "intrusion attempt" })
    expect(error).not.toBeNull()
  })

  it("storage: the owner can read their document object; another client cannot", async () => {
    const mine = await clientA.storage.from("documents").download(storagePath)
    expect(mine.data).not.toBeNull()
    const theirs = await clientB.storage.from("documents").download(storagePath)
    expect(theirs.data).toBeNull()
  })

  it("instructor_offer_feed exposes no client PII (structurally redacted)", async () => {
    // The view simply does not select these columns — asking for them errors.
    const namePeek = await instructor.from("instructor_offer_feed").select("full_name").limit(1)
    expect(namePeek.error).not.toBeNull()
    const emailPeek = await instructor.from("instructor_offer_feed").select("email").limit(1)
    expect(emailPeek.error).not.toBeNull()
    // The safe columns are readable (no rows is fine — we only assert shape).
    const safe = await instructor.from("instructor_offer_feed").select("offer_id, type, area_label").limit(1)
    expect(safe.error).toBeNull()
  })

  it("engagement chat: instructor sees ONLY their thread, never the staff thread", async () => {
    const { data: instr } = await admin
      .from("instructors")
      .select("id")
      .eq("email", "instructor@carrypath.test")
      .single()
    // Bind the instructor to the fixture case so the chat lane opens.
    const { data: eng } = await admin
      .from("engagements")
      .insert({ case_id: caseId, instructor_id: instr!.id, type: "training", status: "active" })
      .select("id")
      .single()

    const { data: me } = await clientA.auth.getUser()
    // Client posts to the staff thread (engagement_id null) and the engagement thread.
    await clientA.from("messages").insert({ case_id: caseId, sender_id: me.user!.id, body: "STAFF ONLY secret" })
    await clientA.from("messages").insert({ case_id: caseId, engagement_id: eng!.id, sender_id: me.user!.id, body: "hello instructor" })

    // Instructor sees the engagement message but NOT the staff-only one.
    const seen = await instructor.from("messages").select("body, engagement_id").eq("case_id", caseId)
    const bodies = (seen.data ?? []).map((m) => m.body)
    expect(bodies).toContain("hello instructor")
    expect(bodies).not.toContain("STAFF ONLY secret")

    // Instructor cannot post into the staff thread (engagement_id null).
    const badWrite = await instructor
      .from("messages")
      .insert({ case_id: caseId, engagement_id: null, body: "reaching staff" })
    expect(badWrite.error).not.toBeNull()

    await admin.from("engagements").delete().eq("id", eng!.id)
  })

  it("document engine: an ENGAGED instructor cannot read generated docs or questionnaire answers", async () => {
    const { data: instr } = await admin
      .from("instructors")
      .select("id")
      .eq("email", "instructor@carrypath.test")
      .single()
    const { data: eng } = await admin
      .from("engagements")
      .insert({ case_id: caseId, instructor_id: instr!.id, type: "training", status: "active" })
      .select("id")
      .single()

    // A generated disclosure addendum + the raw questionnaire answers behind it.
    const { data: genDoc } = await admin
      .from("documents")
      .insert({
        case_id: caseId,
        client_id: clientAId,
        type: "id",
        req_code: "DSC-01",
        generated: true,
        file_name: "disclosure-addendum.pdf",
      })
      .select("id")
      .single()
    await admin.from("requirement_answers").insert({
      case_id: caseId,
      req_code: "DSC-01",
      answers: { arrestExplanation: "SEALED-ARREST-DETAIL" } as never,
    })

    // The owner sees both; the engaged instructor sees neither.
    expect(await count(clientA, "requirement_answers", caseId)).toBeGreaterThan(0)
    expect(await count(instructor, "documents", caseId)).toBe(0)
    expect(await count(instructor, "requirement_answers", caseId)).toBe(0)

    // And cannot reach the row directly by id.
    const direct = await instructor.from("documents").select("id").eq("id", genDoc!.id)
    expect(direct.data ?? []).toEqual([])

    await admin.from("requirement_answers").delete().eq("case_id", caseId)
    await admin.from("documents").delete().eq("id", genDoc!.id)
    await admin.from("engagements").delete().eq("id", eng!.id)
  })

  // ── PART A / Phase 3 — privacy request + retention tables ────────────────
  describe("privacy and retention tables", () => {
    let requestId: string

    beforeAll(async () => {
      const { data } = await admin
        .from("data_requests")
        .insert({
          case_id: caseId,
          client_id: clientAId,
          requester_email: "matrix-probe@test.local",
          kind: "deletion",
        })
        .select("id")
        .single()
      requestId = data!.id
    })

    afterAll(async () => {
      await admin.from("data_requests").delete().eq("id", requestId)
    })

    it("an applicant sees their own data request; another applicant sees none", async () => {
      expect(await count(clientA, "data_requests", caseId)).toBeGreaterThan(0)
      expect(await count(clientB, "data_requests", caseId)).toBe(0)
    })

    it("an instructor cannot see that a privacy request exists", async () => {
      expect(await count(instructor, "data_requests", caseId)).toBe(0)
    })

    it("an applicant cannot mark their own request fulfilled", async () => {
      await clientA.from("data_requests").update({ status: "fulfilled" }).eq("id", requestId)
      // PostgREST reports success-with-zero-rows on an RLS-filtered update, so
      // re-read with service role rather than trusting the absence of an error.
      const { data } = await admin.from("data_requests").select("status").eq("id", requestId).single()
      expect(data!.status).toBe("open")
    })

    it("retention windows are admin-only to change", async () => {
      await staff.from("retention_policies").update({ enabled: true, retain_days: 1 }).eq("key", "notification")
      const { data } = await admin
        .from("retention_policies")
        .select("enabled, retain_days")
        .eq("key", "notification")
        .single()
      expect(data!.enabled).toBe(false)
      expect(data!.retain_days).toBeNull()
    })

    it("an instructor cannot read retention policy or erasure history", async () => {
      expect(await count(instructor, "retention_policies")).toBe(0)
      expect(await count(instructor, "data_erasure_log")).toBe(0)
    })

    it("the erasure log cannot be deleted, even by staff or admin", async () => {
      const { data: entry } = await admin
        .from("data_erasure_log")
        .insert({ case_id: caseId, client_id: clientAId, surfaces: { probe: 1 } })
        .select("id")
        .single()

      // No delete policy exists on this table — the record of an erasure must
      // outlive everyone's ability to remove it, including ours.
      await staff.from("data_erasure_log").delete().eq("id", entry!.id)
      await adminUser.from("data_erasure_log").delete().eq("id", entry!.id)
      const { data } = await admin.from("data_erasure_log").select("id").eq("id", entry!.id).maybeSingle()
      expect(data).not.toBeNull()

      await admin.from("data_erasure_log").delete().eq("id", entry!.id)
    })

    it("signing evidence cannot be deleted by any interactive session", async () => {
      const { data: ev } = await admin
        .from("signature_events")
        .insert({
          case_id: caseId,
          signer_key: "applicant",
          req_code: "AFF-01",
          document_sha256: "matrixprobe",
          consent_text: "probe",
        })
        .select("id")
        .single()

      // ESIGN/UETA evidence is append-only by construction. Erasure minimizes
      // it (nulls ip/user_agent); nothing deletes it.
      await clientA.from("signature_events").delete().eq("id", ev!.id)
      await staff.from("signature_events").delete().eq("id", ev!.id)
      const { data } = await admin.from("signature_events").select("id").eq("id", ev!.id).maybeSingle()
      expect(data).not.toBeNull()

      await admin.from("signature_events").delete().eq("id", ev!.id)
    })
  })
})
