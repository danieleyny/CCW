/**
 * Sponsor multi-worker (S1) — provisioning idempotency, end-to-end scaling to a second
 * worker, the rep-request RLS, and the P0.1 privacy boundary at packet_only scope.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { adminClient, anonClientFor, supabaseReachable, DEMO_PASSWORD } from "../helpers/supabase"
import { ensureSponsorCompany, ensureSponsorRep, addSponsoredWorker } from "@/lib/sponsor/provision"

type DB = SupabaseClient<Database>
const reachable = await supabaseReachable()
const admin = adminClient()

const COMPANY = "ISS Action QA " + Date.now()
const REP_EMAIL = `pamela-qa-${Date.now()}@carrypath.test`
const MINT_EMAIL = `mint-qa-${Date.now()}@carrypath.test`
const WORKER_A = `worker-a-${Date.now()}@carrypath.test`
const WORKER_B = `worker-b-${Date.now()}@carrypath.test`

let sponsorId = ""
let repId = ""
const createdCaseIds: string[] = []
const createdClientEmails = [WORKER_A, WORKER_B]

describe.skipIf(!reachable)("sponsor multi-worker", () => {
  beforeAll(async () => {
    // A rep we can sign in as: create the auth user with the demo password, then let
    // ensureSponsorRep find + bind it (minting is what we test separately).
    const created = await admin.auth.admin.createUser({
      email: REP_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Pamela QA" },
    })
    repId = created.data.user!.id
  })

  afterAll(async () => {
    await admin.from("sponsor_worker_requests").delete().eq("sponsor_id", sponsorId)
    for (const id of createdCaseIds) await admin.from("cases").delete().eq("id", id)
    for (const email of createdClientEmails) {
      const { data: c } = await admin.from("clients").select("id").ilike("email", email).maybeSingle()
      if (c) await admin.from("clients").delete().eq("id", c.id)
    }
    if (sponsorId) {
      await admin.from("case_sponsorships").delete().eq("sponsor_id", sponsorId)
      await admin.from("sponsors").delete().eq("id", sponsorId)
    }
    await admin.auth.admin.deleteUser(repId).catch(() => {})
    const mint = (await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })).data.users.find((u) => u.email === MINT_EMAIL)
    if (mint) await admin.auth.admin.deleteUser(mint.id).catch(() => {})
  })

  it("ensureSponsorCompany is idempotent — two calls, one company", async () => {
    const a = await ensureSponsorCompany(admin, { companyName: COMPANY, custodianName: "Dana Ruiz", custodianLicenseNumber: "CUST-1" })
    const b = await ensureSponsorCompany(admin, { companyName: COMPANY, custodianName: "Someone Else", custodianLicenseNumber: "CUST-2" })
    expect(a.sponsorId).toBeTruthy()
    expect(b.sponsorId).toBe(a.sponsorId)
    sponsorId = a.sponsorId!
    const { count } = await admin.from("sponsors").select("id", { count: "exact", head: true }).ilike("legal_name", COMPANY)
    expect(count).toBe(1)
    // The confirmed custodian is not clobbered by the second call.
    const { data: row } = await admin.from("sponsors").select("custodian_name").eq("id", sponsorId).single()
    expect(row!.custodian_name).toBe("Dana Ruiz")
  })

  it("ensureSponsorRep reuses an existing account — no 'email already in use' failure", async () => {
    const a = await ensureSponsorRep(admin, { sponsorId, repName: "Pamela QA", repEmail: REP_EMAIL })
    const b = await ensureSponsorRep(admin, { sponsorId, repName: "Pamela QA", repEmail: REP_EMAIL })
    expect(a.error).toBeUndefined()
    expect(a.repId).toBe(repId)
    expect(b.error).toBeUndefined()
    expect(b.repId).toBe(repId)
    const { data: prof } = await admin.from("profiles").select("role, sponsor_id").eq("id", repId).single()
    expect(prof!.role).toBe("sponsor")
    expect(prof!.sponsor_id).toBe(sponsorId)
  })

  it("ensureSponsorRep mints a new rep with a temp password, then reuses it", async () => {
    const first = await ensureSponsorRep(admin, { sponsorId, repName: "Mint QA", repEmail: MINT_EMAIL })
    expect(first.repId).toBeTruthy()
    expect(first.tempPassword).toBeTruthy()
    const second = await ensureSponsorRep(admin, { sponsorId, repName: "Mint QA", repEmail: MINT_EMAIL })
    expect(second.repId).toBe(first.repId)
    expect(second.tempPassword).toBeUndefined() // not minted again
  })

  it("scales to two workers under ONE company, each with its own token, visible only after consent", async () => {
    // Worker A is created with only an email (no confirmed legal name) → the invite is HELD.
    const a = await addSponsoredWorker(admin, { sponsorId, repId, repEmail: REP_EMAIL, repName: "Pamela QA", scope: "packet_only", actorId: repId, applicantEmail: WORKER_A })
    // Worker B is created with a name that resolves → the invite is ready.
    const b = await addSponsoredWorker(admin, { sponsorId, repId, repEmail: REP_EMAIL, repName: "Pamela QA", scope: "packet_only", actorId: repId, applicantEmail: WORKER_B, applicantName: "Worker Beta" })
    expect(a.caseId).toBeTruthy()
    expect(b.caseId).toBeTruthy()
    createdCaseIds.push(a.caseId!, b.caseId!)

    // One company, one rep, two bindings, two distinct tokens.
    const { data: bindings } = await admin.from("case_sponsorships").select("id, invite_token, applicant_consented_at").eq("sponsor_id", sponsorId)
    expect(bindings!.length).toBe(2)
    const tokens = bindings!.map((r) => r.invite_token)
    expect(new Set(tokens).size).toBe(2)
    expect(tokens.every((t) => !!t)).toBe(true)

    // No confirmed legal name → invite HELD (never surfaced with a name that could be wrong).
    expect(a.identityResolved).toBe(false)
    expect(a.inviteUrl).toBeUndefined()
    // Confirmed name → invite ready.
    expect(b.identityResolved).toBe(true)
    expect(b.inviteUrl).toContain("/invite/")

    // The rep sees NEITHER worker before consent.
    const rep: DB = await anonClientFor(REP_EMAIL)
    expect((await rep.from("sponsor_case_scope").select("case_id")).data ?? []).toEqual([])

    // Consent worker B only → the rep now sees exactly B.
    await admin.from("case_sponsorships").update({ applicant_consented_at: new Date().toISOString(), status: "active" }).eq("case_id", b.caseId!)
    const { data: visible } = await rep.from("sponsor_case_scope").select("case_id")
    expect((visible ?? []).map((r) => r.case_id)).toEqual([b.caseId])
  })

  it("at packet_only scope a hidden applicant requirement never reaches the rep's feed", async () => {
    // Bind a hidden disclosure (ARR-01) to worker B's (consented) case.
    const caseId = createdCaseIds[1]
    const { data: arr } = await admin.from("requirements").select("id").eq("req_code", "ARR-01").is("effective_to", null).limit(1).maybeSingle()
    await admin.from("case_requirements").insert({ case_id: caseId, requirement_id: arr!.id, req_code: "ARR-01", status: "pending" })

    const rep: DB = await anonClientFor(REP_EMAIL)
    const { data: feed } = await rep.from("sponsor_requirement_feed").select("req_code").eq("case_id", caseId)
    const codes = (feed ?? []).map((r) => r.req_code)
    expect(codes).not.toContain("ARR-01") // hidden — absent even at packet_only
    expect(codes.every((c) => (c ?? "").startsWith("SPN-"))).toBe(true) // only the company packet
  })

  it("rep-request RLS: a rep may create + read ONLY their own company's requests, never another's, never update", async () => {
    const rep: DB = await anonClientFor(REP_EMAIL)

    // Own company → allowed.
    const ok = await rep.from("sponsor_worker_requests").insert({
      sponsor_id: sponsorId,
      requested_by: repId,
      applicant_name: "Requested Worker",
      applicant_email: "requested-worker@example.com",
      requested_scope: "packet_only",
    })
    expect(ok.error).toBeNull()

    // A different company → refused by RLS.
    const { data: other } = await admin.from("sponsors").insert({ legal_name: "Other Co QA " + Date.now() }).select("id").single()
    const bad = await rep.from("sponsor_worker_requests").insert({
      sponsor_id: other!.id,
      requested_by: repId,
      applicant_name: "X",
      applicant_email: "x@example.com",
    })
    expect(bad.error).not.toBeNull()
    await admin.from("sponsors").delete().eq("id", other!.id)

    // SELECT sees own row; UPDATE is refused (no rep update policy).
    const { data: mine } = await rep.from("sponsor_worker_requests").select("id, status")
    expect(mine!.length).toBe(1)
    await rep.from("sponsor_worker_requests").update({ status: "approved" }).eq("id", mine![0].id)
    const { data: after } = await admin.from("sponsor_worker_requests").select("status").eq("id", mine![0].id).single()
    expect(after!.status).toBe("pending") // unchanged — rep cannot self-approve

    // The insert raised a staff task (definer trigger; reps can't write tasks).
    const { data: tasks } = await admin.from("tasks").select("title").ilike("title", "Sponsor worker request:%")
    expect((tasks ?? []).length).toBeGreaterThan(0)
  })
})
