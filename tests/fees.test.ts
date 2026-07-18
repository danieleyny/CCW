/**
 * Fee readiness. Two things must never break here:
 *
 *  1. Amounts come from the `fees` table, so an admin edit moves every surface.
 *     A hardcoded dollar value in the UI would drift from reality silently.
 *  2. The retired-law-enforcement waiver is applied. It's a $340 swing that the
 *     people it applies to routinely don't know about.
 *
 * Skips when Supabase isn't reachable.
 */
import { describe, expect, it } from "vitest"
import { computeFeeSummary, FINGERPRINT_SCHEDULING } from "@/lib/fees"
import { adminClient, anonClientFor, supabaseReachable } from "./helpers/supabase"

const reachable = await supabaseReachable()
const admin = adminClient()

describe.skipIf(!reachable)("computeFeeSummary", () => {
  it("a standard new application owes both fees", async () => {
    const s = await computeFeeSummary(admin, {})
    expect(s.items).toHaveLength(2)
    const [app, print] = s.items
    expect(app.amountCents).toBeGreaterThan(0)
    expect(app.waived).toBeFalsy()
    expect(print.amountCents).toBeGreaterThan(0)
    expect(s.totalCents).toBe(app.amountCents + print.amountCents)
  })

  it("a renewal owes the same application fee as a new application", async () => {
    const neu = await computeFeeSummary(admin, {})
    const renewal = await computeFeeSummary(admin, { isRenewal: true })
    expect(renewal.items[0].amountCents).toBe(neu.items[0].amountCents)
    // Only the wording of WHEN it's due changes.
    expect(renewal.items[0].when).toMatch(/renewal/i)
  })

  it("retired law enforcement: application waived, fingerprint fee still owed", async () => {
    const s = await computeFeeSummary(admin, { isRetiredLeo: true })
    const [app, print] = s.items
    expect(app.amountCents).toBe(0)
    expect(app.waived).toBe(true)
    expect(app.waivedReason).toMatch(/retired law enforcement/i)
    expect(print.amountCents).toBeGreaterThan(0)
    expect(s.totalCents).toBe(print.amountCents)
    expect(s.hasWaiver).toBe(true)
  })

  it("reads amounts from the schedule — an admin fee change moves the total", async () => {
    const { data: before } = await admin
      .from("fees")
      .select("amount_cents")
      .eq("key", "nypd_application")
      .single()
    try {
      await admin.from("fees").update({ amount_cents: 35500 }).eq("key", "nypd_application")
      const s = await computeFeeSummary(admin, {})
      expect(s.items[0].amountCents).toBe(35500)
      expect(s.items[0].amount).toBe("$355")
    } finally {
      await admin.from("fees").update({ amount_cents: before!.amount_cents }).eq("key", "nypd_application")
    }
  })

  it("never claims the fees are paid to us, and always says non-refundable", async () => {
    const s = await computeFeeSummary(admin, {})
    for (const item of s.items) {
      expect(item.payTo).not.toMatch(/gun license nyc/i)
      expect(item.payTo.length).toBeGreaterThan(0)
      expect(item.when.length).toBeGreaterThan(0)
      expect(item.how.length).toBeGreaterThan(0)
    }
    expect(s.items[0].how.join(" ")).toMatch(/no cash/i)
    expect(s.items[1].caveat, "the vendor's fee drifts — it must carry a caveat").toBeTruthy()
    expect(s.nonRefundable).toMatch(/non-refundable/i)
  })
})

describe("fingerprint scheduling facts", () => {
  it("links to the official lookup instead of printing an unverifiable service code", () => {
    // The public DCJS codes (15464Z / 15465F) are for record reviews, not NYPD
    // handgun licensing. Printing one would send someone to the wrong
    // appointment — a reprint and a second fee.
    const blob = JSON.stringify(FINGERPRINT_SCHEDULING)
    expect(blob).not.toMatch(/\b\d{5}[A-Z]\b/)
    expect(FINGERPRINT_SCHEDULING.lookupUrl).toMatch(/identogo\.com/)
    expect(FINGERPRINT_SCHEDULING.phone).toBe("(877) 472-6915")
    expect(FINGERPRINT_SCHEDULING.serviceCodeNote).toMatch(/don't guess/i)
  })
})

describe.skipIf(!reachable)("fee receipts stay behind the privacy firewall", () => {
  it("an instructor cannot see a fee receipt, and it never files as a photo ID", async () => {
    const { data: kase } = await admin.from("cases").select("id, client_id").limit(1).single()
    const { data: doc } = await admin
      .from("documents")
      .insert({
        case_id: kase!.id,
        client_id: kase!.client_id,
        // Real types. Dumping a receipt into the generic 'id' slot is the bug
        // that put a generated addendum in the Government-photo-ID slot.
        type: "nypd_fee_receipt",
        req_code: "FEE-01",
        status: "pending",
        file_name: "receipt.pdf",
      })
      .select("id, type")
      .single()

    try {
      expect(doc!.type).toBe("nypd_fee_receipt")
      const instructor = await anonClientFor("instructor@carrypath.test")
      const { count } = await instructor
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("id", doc!.id)
      expect(count ?? 0, "an instructor must never see a fee receipt").toBe(0)
    } finally {
      await admin.from("documents").delete().eq("id", doc!.id)
    }
  })
})

describe("we never collect the government fees", () => {
  it("the fee module has no payment surface — only guidance", async () => {
    // The line we can't cross: taking the NYPD or fingerprint fee, even as a
    // pass-through, puts us in the role NYPD reserves for the applicant.
    const feesModule = await import("@/lib/fees")
    const exported = Object.keys(feesModule).join(" ")
    expect(exported).not.toMatch(/checkout|charge|collect|payIntent|stripe/i)
  })
})
