/**
 * The sponsored armed-guard track, end to end through processIntake: the derived
 * track lands on the case, the right requirement set seeds (armed credentials +
 * the company packet, with the Concealed/Special-Carry-only items excluded), and
 * an UNRESOLVED case seeds only the packet (never a checklist we're unsure of).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { adminClient, supabaseReachable } from "./helpers/supabase"
import { processIntake } from "@/lib/intake/process"
import type { WizardAnswers } from "@/lib/intake/answers"

const reachable = await supabaseReachable()
const admin = adminClient()

let clientId = ""
let sponsorId = ""
const caseIds: string[] = []

async function sponsoredCase(): Promise<string> {
  const { data: k } = await admin.from("cases").insert({ client_id: clientId, stage: "lead" }).select("id").single()
  const caseId = k!.id
  caseIds.push(caseId)
  await admin.from("case_sponsorships").insert({
    case_id: caseId,
    sponsor_id: sponsorId,
    invited_email: "rep-intake@carrypath.test",
  })
  return caseId
}

async function codes(caseId: string) {
  const { data } = await admin.from("case_requirements").select("req_code, status").eq("case_id", caseId)
  return data ?? []
}

describe.skipIf(!reachable)("sponsored armed-guard intake", () => {
  beforeAll(async () => {
    const { data: c } = await admin.from("clients").select("id").eq("email", "client1@carrypath.test").single()
    clientId = c!.id
    const { data: s } = await admin.from("sponsors").insert({ legal_name: "Intake Guard Co." }).select("id").single()
    sponsorId = s!.id
  })

  afterAll(async () => {
    for (const id of caseIds) await admin.from("cases").delete().eq("id", id)
    await admin.from("sponsors").delete().eq("id", sponsorId)
  })

  it("Branch A (NYC): carry_guard — seeds armed credentials + packet, drops the carry-only items", async () => {
    const caseId = await sponsoredCase()
    const answers: WizardAnswers = { residence: "nyc", borough: "Brooklyn", legalState: "NY", licenseType: "carry" }
    await processIntake(admin, caseId, "nyc", answers)

    const { data: kase } = await admin.from("cases").select("license_track").eq("id", caseId).single()
    expect(kase!.license_track).toBe("carry_guard")

    const rows = await codes(caseId)
    const byCode = new Map(rows.map((r) => [r.req_code, r.status]))
    // Armed credentials + company packet are pending.
    for (const c of ["GRD-01", "GRD-02", "GRD-03", "GRD-04", "FRM-01", "CSC-01", "PLE-01", "SPN-01", "SPN-05", "REF-02"]) {
      expect(byCode.get(c), `${c} should be pending`).toBe("pending")
    }
    // The Concealed/Special-Carry-only items do NOT apply to a Carry Guard file.
    for (const c of ["TRN-01", "SOC-01", "REF-01"]) {
      expect(byCode.get(c), `${c} should be N/A for armed guard`).toBe("na")
    }
  })

  it("Branch C (out of state): sponsored_unresolved — only the packet, applicant set held", async () => {
    const caseId = await sponsoredCase()
    const answers: WizardAnswers = {
      residence: "non_resident",
      legalState: "NJ",
      nycAssignment: true,
      licenseType: "carry",
    }
    await processIntake(admin, caseId, "special_carry", answers)

    const { data: kase } = await admin.from("cases").select("license_track").eq("id", caseId).single()
    expect(kase!.license_track).toBe("sponsored_unresolved")

    const rows = await codes(caseId)
    const present = new Set(rows.map((r) => r.req_code))
    // The company packet is seeded so the sponsor can start immediately…
    expect(present.has("SPN-01")).toBe(true)
    // …but the applicant's NYPD-specific armed credentials are NOT.
    expect(present.has("GRD-01")).toBe(false)
    expect(present.has("FRM-01")).toBe(false)
  })
})
