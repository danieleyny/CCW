/**
 * The requirement → action map is the backbone of the document engine: the
 * checklist UI, the questionnaire engine, and the generators all read it. If the
 * registry gains a requirement and nobody maps it, the customer gets a dead item
 * with no way to complete it. This test makes that impossible to miss.
 *
 * Runs against the live local registry (skips when Supabase isn't reachable).
 */
import { describe, expect, it } from "vitest"
import { REQUIREMENT_ACTIONS, actionFor } from "@/lib/requirements/actions"
import { adminClient, supabaseReachable } from "./helpers/supabase"

const reachable = await supabaseReachable()

describe("requirement → action map", () => {
  it("every generate action names a questionnaire", () => {
    for (const [code, a] of Object.entries(REQUIREMENT_ACTIONS)) {
      if (a.mode === "generate") {
        expect(a.questionnaireId, `${code} is generate but has no questionnaireId`).toBeTruthy()
      }
    }
  })

  it("every obtain action gives steps AND an official source", () => {
    for (const [code, a] of Object.entries(REQUIREMENT_ACTIONS)) {
      if (a.mode === "obtain") {
        expect(a.steps?.length, `${code} is obtain but has no steps`).toBeGreaterThan(0)
        expect(a.sourceUrl, `${code} is obtain but has no sourceUrl`).toBeTruthy()
      }
    }
  })

  it("anything notarized is also marked sensitive (affidavits/references)", () => {
    for (const [code, a] of Object.entries(REQUIREMENT_ACTIONS)) {
      if (a.notarize) expect(a.sensitive, `${code} is notarized but not sensitive`).toBe(true)
    }
  })

  it("disclosure/arrest/affidavit/reference requirements are sensitive", () => {
    // These carry disclosure content — an instructor must never see them.
    for (const code of ["DSC-01", "QUE-01", "ARR-01", "OOP-01", "DIR-01", "COH-01", "REF-01", "REF-02"]) {
      expect(actionFor(code)?.sensitive, `${code} must be sensitive`).toBe(true)
    }
  })

  it.skipIf(!reachable)("every ACTIVE registry requirement has an action", async () => {
    const admin = adminClient()
    const { data } = await admin
      .from("requirements")
      .select("req_code")
      .is("effective_to", null)
    const codes = [...new Set((data ?? []).map((r) => r.req_code))].sort()
    expect(codes.length).toBeGreaterThan(0)

    const unmapped = codes.filter((c) => !actionFor(c))
    expect(unmapped, `unmapped req_codes: ${unmapped.join(", ")}`).toEqual([])
  })
})
