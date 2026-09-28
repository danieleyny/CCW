/**
 * SPECIAL_CARRY_CHANNEL DB checks: the SPC-01 county-licence gate (Phase 1) and the
 * referral channel's privacy firewall (Phase 3) — aggregate counts only, per-person stage
 * label ONLY with consent, never a name/requirement/document/disclosure.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { adminClient, anonClientFor, supabaseReachable, DEMO_PASSWORD } from "../helpers/supabase"
import { evaluatePreFilingGate } from "@/lib/qa-gate"

type DB = SupabaseClient<Database>
const reachable = await supabaseReachable()
const admin = adminClient()

describe.skipIf(!reachable)("SPC-01 is a blocking county-licence document", () => {
  const cases: string[] = []
  const clients: string[] = []
  let spcId = ""

  beforeAll(async () => {
    const { data } = await admin.from("requirements").select("id, blocking").eq("req_code", "SPC-01").is("effective_to", null).limit(1).maybeSingle()
    spcId = data!.id
    // The fix: SPC-01 is now blocking (was advisory).
    expect(data!.blocking).toBe(true)
  })
  afterAll(async () => {
    for (const id of cases) await admin.from("cases").delete().eq("id", id)
    for (const id of clients) await admin.from("clients").delete().eq("id", id)
  })

  it("a Special Carry case with the county licence still PENDING is not ready to file", async () => {
    const { data: cl } = await admin.from("clients").insert({ full_name: "SPC Gate", email: `spc-${crypto.randomUUID()}@test.local`, track: "non_resident" }).select("id").single()
    clients.push(cl!.id)
    const { data: kase } = await admin.from("cases").insert({ client_id: cl!.id, stage: "document_collection", license_track: "concealed_carry" }).select("id").single()
    cases.push(kase!.id)
    await admin.from("case_requirements").insert({ case_id: kase!.id, requirement_id: spcId, req_code: "SPC-01", status: "pending" })

    const gate = await evaluatePreFilingGate(admin, kase!.id)
    expect(gate.ok).toBe(false)
    // SPC-01 specifically is the county-licence gap holding the case back. (Before the
    // fix it was advisory/optional, so it never appeared here — the case could file
    // without the document the whole application rests on.)
    expect(gate.blockers.find((b) => b.kind === "blocking_requirements")?.detail).toContain("SPC-01")
  })
})

describe.skipIf(!reachable)("referral channel — aggregate only; per-person stage needs consent", () => {
  const REP = `ref-rep-${Date.now()}@carrypath.test`
  const REP2 = `ref-rep2-${Date.now()}@carrypath.test`
  const APPLICANT = `ref-applicant-${Date.now()}@carrypath.test`
  let sponsorId = ""
  let sponsor2Id = ""
  let repId = ""
  let rep2Id = ""
  let applicantId = ""
  const caseIds: string[] = []
  const clientIds: string[] = []

  async function makeRep(email: string, sponsorLegal: string): Promise<{ sponsorId: string; repId: string }> {
    const { data: sp } = await admin.from("sponsors").insert({ legal_name: sponsorLegal }).select("id").single()
    const created = await admin.auth.admin.createUser({ email, password: DEMO_PASSWORD, email_confirm: true, user_metadata: { full_name: "Ref Rep" } })
    const id = created.data.user!.id
    await admin.from("profiles").update({ role: "sponsor", sponsor_id: sp!.id, full_name: "Ref Rep" }).eq("id", id)
    return { sponsorId: sp!.id, repId: id }
  }
  async function makeReferredCase(sponsor: string, opts: { signedUp: boolean; licensed: boolean }): Promise<string> {
    const { data: cl } = await admin.from("clients").insert({ full_name: "Referred Person", email: `refc-${crypto.randomUUID()}@test.local`, track: "non_resident", profile_id: null }).select("id").single()
    clientIds.push(cl!.id)
    if (opts.signedUp) {
      // "signed up" = the client is claimed by a profile — a DISTINCT applicant user, not
      // the rep (using the rep would make them the case owner and defeat the RLS check).
      await admin.from("clients").update({ profile_id: applicantId }).eq("id", cl!.id)
    }
    const { data: kase } = await admin.from("cases").insert({ client_id: cl!.id, stage: opts.licensed ? "licensed" : "document_collection", referred_by_sponsor_id: sponsor }).select("id").single()
    caseIds.push(kase!.id)
    return kase!.id
  }

  beforeAll(async () => {
    const app = await admin.auth.admin.createUser({ email: APPLICANT, password: DEMO_PASSWORD, email_confirm: true, user_metadata: { full_name: "Referred Person" } })
    applicantId = app.data.user!.id
    ;({ sponsorId, repId } = await makeRep(REP, "Ref Channel Co " + Date.now()))
    ;({ sponsorId: sponsor2Id, repId: rep2Id } = await makeRep(REP2, "Empty Channel Co " + Date.now()))
    await makeReferredCase(sponsorId, { signedUp: true, licensed: true }) // introduced + signed up + completed
    await makeReferredCase(sponsorId, { signedUp: false, licensed: false }) // introduced only
  })
  afterAll(async () => {
    for (const id of caseIds) await admin.from("cases").delete().eq("id", id)
    for (const id of clientIds) await admin.from("clients").delete().eq("id", id)
    await admin.from("sponsors").delete().eq("id", sponsorId)
    await admin.from("sponsors").delete().eq("id", sponsor2Id)
    await admin.auth.admin.deleteUser(repId).catch(() => {})
    await admin.auth.admin.deleteUser(rep2Id).catch(() => {})
    await admin.auth.admin.deleteUser(applicantId).catch(() => {})
  })

  it("the referrer sees aggregate counts for their own channel only", async () => {
    const rep: DB = await anonClientFor(REP)
    const { data } = await rep.rpc("referral_channel_stats")
    const row = (data ?? [])[0] as { introduced: number; signed_up: number; completed: number }
    expect(Number(row.introduced)).toBe(2)
    expect(Number(row.signed_up)).toBe(1)
    expect(Number(row.completed)).toBe(1)
  })

  it("the referrer CANNOT read the referred applicants' rows directly (no name leaks)", async () => {
    const rep: DB = await anonClientFor(REP)
    // No sponsorship binds these cases to the rep, so case/client RLS returns nothing.
    const { data: caseRows } = await rep.from("cases").select("id, client_id").in("id", caseIds)
    expect(caseRows ?? []).toEqual([])
    const { data: clientRows } = await rep.from("clients").select("id, full_name").in("id", clientIds)
    expect(clientRows ?? []).toEqual([])
  })

  it("per-person status is empty until the applicant consents, then shows STAGE ONLY", async () => {
    const rep: DB = await anonClientFor(REP)
    // Default: nobody has shared → empty.
    expect((await rep.rpc("referral_consented_stages")).data ?? []).toEqual([])

    // Consent for the second (introduced-only) case, recorded via the definer RPC as staff
    // (owner-or-staff guarded — the referrer can never call it).
    const staff: DB = await anonClientFor("staff@carrypath.test")
    const { error } = await staff.rpc("referral_record_consent", { p_case_id: caseIds[1], p_version: "v1" })
    expect(error).toBeNull()

    const { data: stages } = await rep.rpc("referral_consented_stages")
    const rows = (stages ?? []) as Record<string, unknown>[]
    expect(rows.length).toBe(1)
    expect(rows[0].case_id).toBe(caseIds[1])
    expect(rows[0].stage).toBe("document_collection")
    // STAGE ONLY — no name, no requirement, no document, no disclosure fields on the row.
    expect(Object.keys(rows[0]).sort()).toEqual(["case_id", "stage"])

    // Revoke → it disappears again.
    await staff.rpc("referral_revoke", { p_case_id: caseIds[1] })
    expect((await rep.rpc("referral_consented_stages")).data ?? []).toEqual([])
  })

  it("a referrer with no referred cases sees the identical empty aggregate — existence is never revealed", async () => {
    const rep2: DB = await anonClientFor(REP2)
    const { data } = await rep2.rpc("referral_channel_stats")
    const row = (data ?? [])[0] as { introduced: number; signed_up: number; completed: number }
    expect([Number(row.introduced), Number(row.signed_up), Number(row.completed)]).toEqual([0, 0, 0])
    expect((await rep2.rpc("referral_consented_stages")).data ?? []).toEqual([])
  })
})
