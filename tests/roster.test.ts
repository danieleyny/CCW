/**
 * COH-01 and REF-01/02 are completed by OTHER people. The applicant names them;
 * each person writes and notarizes their own document through a private link.
 *
 * These lock the two things that would hurt a real applicant: submitting the
 * list must never satisfy the requirement (only notarized copies do), and
 * editing the list must never delete somebody whose notarized document is
 * already in.
 *
 * Runs against a throwaway case; skips when Supabase isn't reachable.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

// lib/email is `server-only` (it holds the Resend key). Mocking it lets these
// drive the real token-minting path without pulling the mailer into the test.
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }))
import { peopleFromAnswers, livesAlone, syncReferences, syncCohabitants } from "@/lib/requirements/roster"
import { actionFor, REQUIREMENT_ACTIONS } from "@/lib/requirements/actions"
import { renderRequirementDocument } from "@/lib/requirements/document-engine"
import { adminClient, supabaseReachable } from "./helpers/supabase"

const reachable = await supabaseReachable()
const admin = adminClient()
let caseId = ""

describe("roster actions", () => {
  it("the people-driven requirements are roster mode, not generate", () => {
    for (const code of ["COH-01", "REF-01", "REF-02"]) {
      const a = actionFor(code)
      expect(a?.mode, `${code} must be a roster`).toBe("roster")
      // Routing these through the generator is what produced "No generator for COH-01".
      expect(a?.mode).not.toBe("generate")
    }
  })

  it("every roster action names its questionnaire, table and manage link", () => {
    for (const [code, a] of Object.entries(REQUIREMENT_ACTIONS)) {
      if (a.mode !== "roster") continue
      expect(a.questionnaireId, `${code} has no questionnaire`).toBeTruthy()
      expect(["references", "cohabitants"]).toContain(a.roster)
      expect(a.manageHref, `${code} has nowhere to manage invitations`).toMatch(/^\/portal\/people/)
      // Somebody else notarizes it — it can never be satisfied by generation.
      expect(a.notarize, `${code} must require notarization`).toBe(true)
      // Written by the reference / cohabitant — a trainer sees progress, never
      // the letters, the names or the addresses.
      expect(a.conciergeScope, `${code} must be progress-only to a trainer`).toBe("progress")
    }
  })

  it("reads people out of the questionnaire's saved answers", () => {
    const people = peopleFromAnswers(
      {
        references: [
          { name: " Alex Stone ", email: "alex@example.com", relationship: "Colleague", isFamily: "no" },
          { name: "Robin Fox", relationship: "Cousin", isFamily: "yes" },
          { name: "", email: "ignored@example.com" }, // blank row from the repeater
        ],
      },
      "references"
    )
    expect(people).toHaveLength(2)
    expect(people[0]).toMatchObject({ name: "Alex Stone", email: "alex@example.com", isFamily: false })
    expect(people[1]).toMatchObject({ name: "Robin Fox", email: undefined, isFamily: true })
  })

  it("reads the lives-alone answer in both shapes the questionnaire can save", () => {
    expect(livesAlone({ livesAlone: "yes" })).toBe(true)
    expect(livesAlone({ livesAlone: true })).toBe(true)
    expect(livesAlone({ livesAlone: "no" })).toBe(false)
    expect(livesAlone({})).toBe(false)
  })

  it("refuses to generate a household affidavit for someone who isn't alone", async () => {
    // The applicant can't sign on their housemates' behalf — the old code path
    // just threw "No generator for COH-01" at them instead of saying why.
    await expect(
      renderRequirementDocument({ reqCode: "COH-01", applicantName: "Test", answers: { livesAlone: "no" } })
    ).rejects.toThrow(/private link/i)
  })

  it("generates the sole-occupancy statement when they do live alone", async () => {
    const doc = await renderRequirementDocument({
      reqCode: "COH-01",
      applicantName: "Test Applicant",
      answers: { livesAlone: "yes" },
    })
    expect(doc.documentType).toBe("cohabitant_affidavit")
    expect(doc.fileName).toContain("sole-occupancy")
  })
})

describe.skipIf(!reachable)("roster sync against the database", () => {
  beforeAll(async () => {
    const { data: client } = await admin.from("clients").select("id").limit(1).single()
    const { data } = await admin
      .from("cases")
      .insert({ client_id: client!.id, stage: "lead" })
      .select("id")
      .single()
    caseId = data!.id
  })
  afterAll(async () => {
    if (caseId) await admin.from("cases").delete().eq("id", caseId)
  })

  it("creates references and mints a private link for each", async () => {
    const r = await syncReferences(admin, caseId, [
      { name: "Alex Stone", email: "alex@example.test", relationship: "Colleague" },
      { name: "Robin Fox", relationship: "Neighbor" }, // no email
    ])
    expect(r.added).toBe(2)
    // `invited` now counts REAL deliveries, not "an address exists". With no email
    // provider configured (RESEND_API_KEY unset in test/CI), nothing is delivered,
    // so both fall to needEmail (copy-link fallback). Once Resend is connected,
    // Alex — who has an email — would be invited and only Robin would need a hand-sent link.
    expect(r.invited).toBe(0)
    expect(r.needEmail).toEqual(["Alex Stone", "Robin Fox"])

    const { data: rows } = await admin.from("character_references").select("id, name").eq("case_id", caseId)
    expect(rows).toHaveLength(2)

    // Everybody gets a token, email or not — the link has to exist to be copied.
    const { data: reqs } = await admin.from("reference_requests").select("token").eq("case_id", caseId)
    expect(reqs).toHaveLength(2)
    expect(reqs!.every((x) => (x.token?.length ?? 0) > 20)).toBe(true)
  })

  it("re-submitting the same list updates people instead of duplicating them", async () => {
    const r = await syncReferences(admin, caseId, [
      { name: "alex stone", email: "new@example.test", relationship: "Manager" }, // different case
      { name: "Robin Fox", email: "robin@example.test" },
    ])
    expect(r.added).toBe(0)
    expect(r.updated).toBe(2)

    const { data: rows } = await admin
      .from("character_references")
      .select("name, contact_email")
      .eq("case_id", caseId)
      .order("name")
    expect(rows).toHaveLength(2)
    expect(rows!.find((x) => x.name === "Alex Stone")?.contact_email).toBe("new@example.test")
  })

  it("NEVER drops somebody whose notarized letter is already in", async () => {
    await admin
      .from("character_references")
      .update({ received: true, notarized: true })
      .eq("case_id", caseId)
      .eq("name", "Alex Stone")

    // Alex is missing from the new list — but their notarized letter is filed
    // evidence. Losing it silently would be far worse than a stale row.
    const r = await syncReferences(admin, caseId, [{ name: "Robin Fox", email: "robin@example.test" }])
    expect(r.keptWithEvidence).toEqual(["Alex Stone"])

    const { data: rows } = await admin.from("character_references").select("name").eq("case_id", caseId)
    expect(rows!.map((x) => x.name).sort()).toEqual(["Alex Stone", "Robin Fox"])
  })

  it("drops someone with no evidence when they're removed from the list", async () => {
    await syncReferences(admin, caseId, [])
    const { data: rows } = await admin.from("character_references").select("name").eq("case_id", caseId)
    // Only the notarized one survives.
    expect(rows!.map((x) => x.name)).toEqual(["Alex Stone"])
  })

  it("submitting a household roster does not satisfy COH-01 — notarization does", async () => {
    const r = await syncCohabitants(admin, caseId, [
      { name: "Sam Rivera", email: "sam@example.test", relationship: "Spouse" },
    ])
    expect(r.added).toBe(1)

    const { data: req } = await admin
      .from("case_requirements")
      .select("status")
      .eq("case_id", caseId)
      .eq("req_code", "COH-01")
      .maybeSingle()
    // Materialized rows start pending; naming somebody must never flip it.
    if (req) expect(req.status).not.toBe("satisfied")

    const { data: rows } = await admin
      .from("cohabitants")
      .select("name, token, affidavit_status")
      .eq("case_id", caseId)
    expect(rows).toHaveLength(1)
    expect(rows![0].token?.length ?? 0).toBeGreaterThan(20)
    expect(rows![0].affidavit_status).not.toBe("notarized")
  })
})
