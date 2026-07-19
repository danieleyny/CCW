/**
 * CLASSIFICATION DRIFT GUARD.
 *
 * `requirements.concierge_scope` in SQL is the source of truth — views, RPCs and
 * policies read the column. `lib/requirements/actions.ts` carries the same
 * values for UI copy. Two copies of a security classification is how one of them
 * quietly becomes wrong, so this fails the moment they disagree.
 *
 * The failure mode being prevented is specific: someone adds a requirement to
 * the registry in SQL, the TS map says nothing about it, and a trainer surface
 * renders it as ordinary paperwork because the code defaulted to visible.
 */
import { describe, expect, it } from "vitest"
import { REQUIREMENT_ACTIONS, conciergeScopeFor } from "@/lib/requirements/actions"
import { adminClient, supabaseReachable } from "./helpers/supabase"

const reachable = await supabaseReachable()
const admin = adminClient()

/**
 * Named, not derived. Relaxing any of these means editing this list, which means
 * writing down why in a code review — exactly the friction it should have.
 */
const MUST_BE_HIDDEN = ["DSC-01", "QUE-01", "ARR-01", "OOP-01", "DIR-01", "GMC-01"]
const MUST_BE_PROGRESS = ["COH-01", "REF-01", "REF-02"]

describe.skipIf(!reachable)("concierge classification", () => {
  it("the database agrees with the TypeScript map on every requirement", async () => {
    const { data } = await admin.from("requirements").select("req_code, concierge_scope")
    const mismatches: string[] = []
    for (const row of data ?? []) {
      const ts = conciergeScopeFor(row.req_code)
      if (ts !== row.concierge_scope) {
        mismatches.push(`${row.req_code}: SQL=${row.concierge_scope} TS=${ts}`)
      }
    }
    expect(mismatches, mismatches.join("; ")).toEqual([])
  })

  it("disclosure material is hidden in the DATABASE, not just in the UI", async () => {
    const { data } = await admin
      .from("requirements")
      .select("req_code, concierge_scope")
      .in("req_code", MUST_BE_HIDDEN)
    expect(data!.length).toBeGreaterThan(0)
    for (const row of data ?? []) {
      expect(row.concierge_scope, `${row.req_code} would be visible to a trainer`).toBe("hidden")
    }
  })

  it("third-party documents are progress-only in the database", async () => {
    const { data } = await admin
      .from("requirements")
      .select("req_code, concierge_scope")
      .in("req_code", MUST_BE_PROGRESS)
    for (const row of data ?? []) {
      expect(row.concierge_scope, `${row.req_code} exposes a third party's document`).toBe("progress")
    }
  })

  it("every registry requirement is classified — none left at the default", async () => {
    // The default is 'hidden', so an unclassified row fails safe rather than
    // leaking. But an unclassified row is also a requirement the trainer can't
    // help with, so it should be a deliberate choice, not an oversight.
    const { data } = await admin
      .from("requirements")
      .select("req_code, concierge_scope")
      .is("effective_to", null)
    const codes = [...new Set((data ?? []).map((r) => r.req_code))]
    const unmapped = codes.filter((c) => !REQUIREMENT_ACTIONS[c])
    expect(unmapped, `registry codes with no action entry: ${unmapped.join(", ")}`).toEqual([])
  })

  it("a requirement nobody classified defaults to hidden", async () => {
    // Proves the fail-safe rather than trusting the DDL.
    const { data: sample } = await admin
      .from("requirements")
      .select("jurisdiction_id")
      .limit(1)
      .single()
    const { data: inserted, error } = await admin
      .from("requirements")
      .insert({
        req_code: "ZZZ-99",
        title: "Deliberately unclassified probe",
        jurisdiction_id: sample!.jurisdiction_id,
        severity: "watch",
        trigger_cond: "always",
      })
      .select("id, concierge_scope")
      .single()
    expect(error, error?.message).toBeNull()
    try {
      expect(inserted!.concierge_scope).toBe("hidden")
    } finally {
      await admin.from("requirements").delete().eq("id", inserted!.id)
    }
  })
})
