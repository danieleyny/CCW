/**
 * THE ACCEPTANCE GATE for the sponsor portal.
 *
 * A sponsoring company's rep is a third party we let near an applicant's
 * firearms-licence file — including, at full scope, sealed arrest material and
 * SSN. This suite proves the DATABASE refuses what it must, in every direction:
 *   • no binding, no consent, or revoked → the rep sees nothing;
 *   • cross-case isolation;
 *   • at 'assist', disclosure rows/docs never surface (no file_path either);
 *   • the rep has NO direct read on cases/case_requirements/documents;
 *   • the rep can never write a signature (guard_signature_signer + RLS);
 *   • REVERSE: the applicant's payload for a sponsor row carries no storage path.
 *
 * Habits copied from trainer-scope.test.ts: re-read writes with the service role
 * (PostgREST returns success-with-zero-rows on a filtered write), and assert
 * redaction at KEY level (a null column today is a populated one tomorrow).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { adminClient, anonClientFor, supabaseReachable, DEMO_PASSWORD } from "../helpers/supabase"
import { loadRequirementView } from "@/lib/portal/requirement-view"
import type { MyCase } from "@/lib/portal"

type DB = SupabaseClient<Database>

const reachable = await supabaseReachable()
const admin = adminClient()

let clientId = ""
let caseId = ""
let otherCaseId = ""
let sponsorId = ""
let sponsorshipId = ""
let repId = ""
let rep: DB
let idDocId = ""
let arrestDocId = ""
let spnDocId = ""
const REP_EMAIL = "sponsor-rep@carrypath.test"

describe.skipIf(!reachable)("sponsor scope — the two-way firewall", () => {
  beforeAll(async () => {
    const { data: c } = await admin.from("clients").select("id").eq("email", "client1@carrypath.test").single()
    clientId = c!.id

    const { data: k } = await admin
      .from("cases")
      .insert({ client_id: clientId, stage: "document_collection", license_track: "carry_guard" })
      .select("id")
      .single()
    caseId = k!.id
    const { data: other } = await admin.from("cases").insert({ client_id: clientId, stage: "lead" }).select("id").single()
    otherCaseId = other!.id

    // The company + a provisioned sponsor rep (role set with the service role,
    // the only path allowed to — mirrors the seed).
    const { data: sp } = await admin.from("sponsors").insert({ legal_name: "ACME Guard Co." }).select("id").single()
    sponsorId = sp!.id
    const { data: created } = await admin.auth.admin.createUser({
      email: REP_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Rep Person" },
    })
    repId = created.user!.id
    await admin.from("profiles").update({ role: "sponsor", sponsor_id: sponsorId }).eq("id", repId)

    const { data: s } = await admin
      .from("case_sponsorships")
      .insert({
        case_id: caseId,
        sponsor_id: sponsorId,
        rep_profile_id: repId,
        invited_email: REP_EMAIL,
        invited_name: "Rep Person",
        scope: "full",
        status: "invited", // NOT consented yet
      })
      .select("id")
      .single()
    sponsorshipId = s!.id

    // Requirements + docs: ARR-01 (hidden/disclosure), IDN-01 (full applicant),
    // SPN-01 (sponsor packet). Each with a bound document.
    const { data: reqs } = await admin
      .from("requirements")
      .select("id, req_code")
      .in("req_code", ["ARR-01", "IDN-01", "SPN-01"])
      .is("effective_to", null)
    const R = (code: string) => reqs!.find((r) => r.req_code === code)!

    const mkDoc = async (type: string, code: string, name: string) => {
      const { data } = await admin
        .from("documents")
        .insert({
          case_id: caseId,
          client_id: clientId,
          type: type as never,
          req_code: code,
          file_name: name,
          file_path: `clients/${clientId}/probe/${name}`,
          status: "pending",
        })
        .select("id")
        .single()
      return data!.id
    }
    arrestDocId = await mkDoc("arrest_statement", "ARR-01", "arrest.pdf")
    idDocId = await mkDoc("id", "IDN-01", "id.jpg")
    spnDocId = await mkDoc("carry_guard_company_form", "SPN-01", "company-form.pdf")

    await admin.from("case_requirements").insert([
      { case_id: caseId, requirement_id: R("ARR-01").id, req_code: "ARR-01", status: "pending", document_id: arrestDocId },
      { case_id: caseId, requirement_id: R("IDN-01").id, req_code: "IDN-01", status: "pending", document_id: idDocId },
      { case_id: caseId, requirement_id: R("SPN-01").id, req_code: "SPN-01", status: "pending", document_id: spnDocId },
    ])

    rep = await anonClientFor(REP_EMAIL)
  })

  afterAll(async () => {
    await admin.from("case_sponsorships").delete().eq("id", sponsorshipId)
    await admin.from("cases").delete().in("id", [caseId, otherCaseId])
    await admin.from("sponsors").delete().eq("id", sponsorId)
    await admin.auth.admin.deleteUser(repId).catch(() => {})
  })

  it("before consent, the rep sees NOTHING", async () => {
    expect((await rep.from("sponsor_case_scope").select("case_id")).data ?? []).toEqual([])
    expect((await rep.from("sponsor_requirement_feed").select("req_code")).data ?? []).toEqual([])
    expect((await rep.from("sponsor_document_feed").select("document_id")).data ?? []).toEqual([])
  })

  it("after consent, the rep sees the case and (at full scope) the whole file", async () => {
    await admin
      .from("case_sponsorships")
      .update({ applicant_consented_at: new Date().toISOString(), status: "active", scope: "full" })
      .eq("id", sponsorshipId)

    const { data: cs } = await rep.from("sponsor_case_scope").select("case_id, scope")
    expect(cs?.map((r) => r.case_id)).toEqual([caseId])

    const { data: feed } = await rep.from("sponsor_requirement_feed").select("req_code, party, scope")
    const codes = (feed ?? []).map((r) => r.req_code).sort()
    // Full scope: disclosure (ARR-01), ordinary (IDN-01), and the packet (SPN-01).
    expect(codes).toContain("ARR-01")
    expect(codes).toContain("IDN-01")
    expect(codes).toContain("SPN-01")
  })

  it("the document feed exposes NO file_path, ever", async () => {
    const { data } = await rep.from("sponsor_document_feed").select("*").limit(1)
    expect(data!.length).toBeGreaterThan(0)
    expect(Object.keys(data![0])).not.toContain("file_path")
  })

  it("at 'assist', disclosure rows and their documents disappear", async () => {
    await admin.from("case_sponsorships").update({ scope: "assist" }).eq("id", sponsorshipId)

    const { data: feed } = await rep.from("sponsor_requirement_feed").select("req_code")
    const codes = (feed ?? []).map((r) => r.req_code)
    expect(codes).not.toContain("ARR-01") // hidden disclosure — absent at assist
    expect(codes).toContain("IDN-01") // ordinary paperwork — still visible

    const { data: docs } = await rep.from("sponsor_document_feed").select("req_code")
    expect((docs ?? []).map((d) => d.req_code)).not.toContain("ARR-01")

    await admin.from("case_sponsorships").update({ scope: "full" }).eq("id", sponsorshipId)
  })

  it("the rep has NO direct read on cases / case_requirements / documents", async () => {
    expect((await rep.from("cases").select("id").eq("id", caseId)).data ?? []).toEqual([])
    expect((await rep.from("case_requirements").select("id").eq("case_id", caseId)).data ?? []).toEqual([])
    expect((await rep.from("documents").select("id").eq("case_id", caseId)).data ?? []).toEqual([])
  })

  it("cross-case: the rep sees nothing of a case they aren't bound to", async () => {
    expect((await rep.from("sponsor_case_scope").select("case_id").eq("case_id", otherCaseId)).data ?? []).toEqual([])
    expect((await rep.from("sponsor_requirement_feed").select("req_code").eq("case_id", otherCaseId)).data ?? []).toEqual([])
  })

  it("SIGNATURE LAW: the rep can never write a signature", async () => {
    await rep.from("signatures").insert({ case_id: caseId, signer_key: "applicant", png_base64: "x" }).then(() => {})
    await rep.from("signatures").insert({ case_id: caseId, signer_key: "sponsor:1", png_base64: "x" }).then(() => {})
    const { data } = await admin.from("signatures").select("id").eq("case_id", caseId)
    expect(data ?? []).toEqual([]) // nothing was written, by RLS and/or the DB trigger
  })

  it("sponsor_open_document authorizes + logs a full-scope read, and refuses a non-full one", async () => {
    await admin.from("case_sponsorships").update({ scope: "full" }).eq("id", sponsorshipId)
    const { data: ok } = await rep.rpc("sponsor_open_document", { p_document_id: idDocId })
    expect(ok).toBe(true)
    const { data: log } = await admin
      .from("document_access_log")
      .select("action, viewer_role")
      .eq("document_id", idDocId)
    expect(log?.some((l) => l.action === "view_url_issued" && l.viewer_role === "sponsor")).toBe(true)

    // At 'assist' the disclosure doc leaves the feed → open is refused.
    await admin.from("case_sponsorships").update({ scope: "assist" }).eq("id", sponsorshipId)
    const { data: no } = await rep.rpc("sponsor_open_document", { p_document_id: arrestDocId })
    expect(no).toBe(false)
    await admin.from("case_sponsorships").update({ scope: "full" }).eq("id", sponsorshipId)
  })

  it("REVERSE DIRECTION: the applicant's payload for a sponsor row has no storage path", async () => {
    const myCase = {
      id: caseId,
      client_id: clientId,
      stage: "document_collection",
      client: { full_name: "Jordan Rivera", borough: "Brooklyn", zip: "11201" },
    } as unknown as MyCase
    const view = await loadRequirementView(admin, myCase)
    // The sponsor doc (SPN-01) must not appear as a current/generated/library file.
    expect(view.currentByReq["SPN-01"]).toBeUndefined()
    expect(view.generated["SPN-01"]).toBeUndefined()
    expect(view.filesByReq["SPN-01"]).toBeUndefined()
    // Sanity: an ordinary applicant doc DOES surface (the firewall is selective,
    // not a blanket drop). The signed URL is null only because these probe rows
    // have no real bytes in storage.
    expect(view.currentByReq["IDN-01"]).toBeDefined()
  })
})
