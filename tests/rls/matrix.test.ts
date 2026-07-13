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
})
