/**
 * CONCIERGE QA Phase 3 — the ONE unlock rule. hasPaidPackage / paidPackageCaseIds
 * return true for a paid payments row with the given package_key, whatever its
 * provenance (self-serve Stripe, a staff invoice, or a recorded offline payment).
 * A pending row, or a paid row with no package_key, never unlocks.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { hasPaidPackage, paidPackageCaseIds } from "@/lib/packages"
import { adminClient, supabaseReachable } from "./helpers/supabase"

const reachable = await supabaseReachable()

describe.skipIf(!reachable)("hasPaidPackage / paidPackageCaseIds", () => {
  const admin = adminClient()
  let caseId = ""
  let clientId = ""

  beforeAll(async () => {
    const { data: client } = await admin
      .from("clients")
      .insert({ full_name: "Unlock Test", email: `unlock_${Math.random().toString(36).slice(2)}@test.local`, track: "resident", current_stage: "lead" })
      .select("id")
      .single()
    clientId = client!.id
    const { data: kase } = await admin
      .from("cases")
      .insert({ client_id: clientId, stage: "lead", status: "active", service_mode: "concierge" })
      .select("id")
      .single()
    caseId = kase!.id
  })

  afterAll(async () => {
    if (caseId) await admin.from("cases").delete().eq("id", caseId)
  })

  async function pay(status: string, packageKey: string | null) {
    await admin.from("payments").insert({
      case_id: caseId,
      client_id: clientId,
      amount_cents: 100000,
      type: "full",
      status: status as never,
      package_key: packageKey,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    })
  }

  it("no payment → not unlocked", async () => {
    expect(await hasPaidPackage(admin, caseId, "full_concierge")).toBe(false)
  })

  it("a PENDING full_concierge payment → still not unlocked", async () => {
    await pay("pending", "full_concierge")
    expect(await hasPaidPackage(admin, caseId, "full_concierge")).toBe(false)
  })

  it("a PAID payment with NO package_key → not unlocked (the old requestPayment bug)", async () => {
    await pay("paid", null)
    expect(await hasPaidPackage(admin, caseId, "full_concierge")).toBe(false)
  })

  it("a PAID full_concierge payment → unlocked, via both helpers", async () => {
    await pay("paid", "full_concierge")
    expect(await hasPaidPackage(admin, caseId, "full_concierge")).toBe(true)
    const set = await paidPackageCaseIds(admin, [caseId], "full_concierge")
    expect(set.has(caseId)).toBe(true)
  })

  it("does not unlock a DIFFERENT package", async () => {
    expect(await hasPaidPackage(admin, caseId, "self_guided")).toBe(false)
  })
})
