/**
 * The canonical fact layer: facts resolve from case_facts (with derived + form-
 * local overrides), fall back to intake, and the SSN round-trips through the
 * encrypted store while staying unreadable by any non-service client.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { adminClient, anonClientFor, supabaseReachable } from "./helpers/supabase"
import { resolveFacts } from "@/lib/facts/resolve"
import { setCaseSsn, getCaseSsn, ssnConfigured } from "@/lib/facts/ssn"

const reachable = await supabaseReachable()
const admin = adminClient()
let caseId = ""
let clientId = ""

describe.skipIf(!reachable)("case facts", () => {
  beforeAll(async () => {
    const { data: c } = await admin.from("clients").select("id").eq("email", "client1@carrypath.test").single()
    clientId = c!.id
    const { data: k } = await admin.from("cases").insert({ client_id: clientId, stage: "document_collection" }).select("id").single()
    caseId = k!.id
  })
  afterAll(async () => {
    await admin.from("cases").delete().eq("id", caseId)
  })

  it("derives full name + split DOB + full address from the base facts", async () => {
    // Every row carries `sensitive` — PostgREST unions keys across a bulk insert
    // and fills any omitted one with NULL (not the column default), so a mixed
    // array would violate the NOT NULL. App code (backfillCaseFacts) does the same.
    const f0 = (key: string, value: string, sensitive = false) => ({ case_id: caseId, key, value, source: "applicant", sensitive })
    await admin.from("case_facts").insert([
      f0("applicant.legalFirstName", "Chery"),
      f0("applicant.legalLastName", "Gimps"),
      f0("applicant.dob", "1985-07-15", true),
      f0("applicant.address.street", "742 Evergreen Terrace"),
      f0("applicant.address.city", "Brooklyn"),
      f0("applicant.address.state", "NY"),
      f0("applicant.address.zip", "11201"),
    ])
    const f = await resolveFacts(admin, caseId)
    expect(f["applicant.fullName"]).toBe("Chery Gimps")
    expect(f["applicant.dob.mm"]).toBe("07")
    expect(f["applicant.dob.dd"]).toBe("15")
    expect(f["applicant.dob.yyyy"]).toBe("1985")
    expect(f["applicant.fullAddress"]).toContain("742 Evergreen Terrace")
    expect(f["applicant.fullAddress"]).toContain("Brooklyn")
    expect(f["applicant.fullAddress"]).toContain("NY 11201")
  })

  it("a form-local override wins only for that form", async () => {
    await admin
      .from("case_facts")
      .insert({ case_id: caseId, key: "applicant.address.city", value: "Queens", source: "applicant", sensitive: false, override_req_code: "CSC-01" })
    const shared = await resolveFacts(admin, caseId)
    const overridden = await resolveFacts(admin, caseId, { reqCode: "CSC-01" })
    expect(shared["applicant.address.city"]).toBe("Brooklyn") // unchanged elsewhere
    expect(overridden["applicant.address.city"]).toBe("Queens") // only on that form
  })

  it.skipIf(!ssnConfigured())("SSN round-trips through the encrypted store, unreadable by a client", async () => {
    await setCaseSsn(admin, caseId, "123-45-6789", null)
    expect(await getCaseSsn(admin, caseId, "test")).toBe("123-45-6789")
    // The ciphertext is not the plaintext.
    const { data: row } = await admin.from("case_ssn").select("ciphertext").eq("case_id", caseId).single()
    expect(row!.ciphertext).not.toContain("123-45-6789")
    // A signed-in client cannot read case_ssn at all (no RLS policy → deny).
    const client = await anonClientFor("client1@carrypath.test")
    const { data } = await client.from("case_ssn").select("ciphertext").eq("case_id", caseId)
    expect(data ?? []).toEqual([])
  })
})
