/**
 * Stripe Invoicing — the net-new server pieces, against the real Stripe TEST
 * API and the real webhook route. Skips unless a local Supabase is reachable
 * AND Stripe is enabled with test keys (STRIPE_ENABLED=true + sk_test/whsec in
 * .env.local) — so the default Stripe-off gate stays green.
 *
 *   1. findOrCreateCustomer — creates + persists + reuses one Customer.
 *   2. webhook `invoice.paid` — a signed synthetic event marks the payment paid
 *      and advances the case stage (proves the handler without Stripe delivery).
 */
import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })

import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { STRIPE_ENABLED, getStripe } from "@/lib/stripe"
import { findOrCreateCustomer } from "@/lib/stripe/invoicing"
import { POST as webhookPOST } from "@/app/api/stripe/webhook/route"
import { adminClient, supabaseReachable } from "./helpers/supabase"

const reachable = await supabaseReachable()
const admin = adminClient()
const stripe = getStripe()

describe.skipIf(!reachable || !STRIPE_ENABLED || !stripe)("stripe invoicing (test mode)", () => {
  let clientId = ""
  let createdCustomerId = ""

  beforeAll(async () => {
    const { data } = await admin
      .from("clients")
      .insert({
        full_name: "Invoice Test",
        email: `invoice-${crypto.randomUUID()}@test.local`,
        track: "resident",
      })
      .select("id")
      .single()
    clientId = data!.id
  })

  afterAll(async () => {
    if (createdCustomerId && stripe) await stripe.customers.del(createdCustomerId).catch(() => {})
    if (clientId) await admin.from("clients").delete().eq("id", clientId)
  })

  it("findOrCreateCustomer creates, persists, then reuses one Customer", async () => {
    const { data: client } = await admin
      .from("clients")
      .select("id, email, full_name, stripe_customer_id")
      .eq("id", clientId)
      .single()

    const id1 = await findOrCreateCustomer(admin, stripe!, client!)
    createdCustomerId = id1
    expect(id1).toMatch(/^cus_/)

    // Persisted on the row.
    const { data: after } = await admin.from("clients").select("stripe_customer_id").eq("id", clientId).single()
    expect(after!.stripe_customer_id).toBe(id1)

    // A second call reuses it — no duplicate Customer.
    const id2 = await findOrCreateCustomer(admin, stripe!, { ...client!, stripe_customer_id: id1 })
    expect(id2).toBe(id1)
  })

  it("webhook invoice.paid marks the payment paid and advances the stage", async () => {
    // A case early in the ladder + a pending invoice row to reconcile.
    const { data: kase } = await admin
      .from("cases")
      .insert({ client_id: clientId, stage: "lead" })
      .select("id")
      .single()
    const caseId = kase!.id
    const { data: payment } = await admin
      .from("payments")
      .insert({
        case_id: caseId,
        client_id: clientId,
        amount_cents: 12345,
        type: "full",
        status: "pending",
        description: "Invoice webhook test",
        stripe_invoice_id: `in_test_${crypto.randomUUID()}`,
      })
      .select("id")
      .single()

    try {
      const event = {
        id: `evt_${crypto.randomUUID()}`,
        object: "event",
        type: "invoice.paid",
        data: { object: { id: `in_${crypto.randomUUID()}`, object: "invoice", metadata: { payment_id: payment!.id } } },
      }
      const body = JSON.stringify(event)
      const signature = stripe!.webhooks.generateTestHeaderString({
        payload: body,
        secret: process.env.STRIPE_WEBHOOK_SECRET!,
      })
      const req = new NextRequest("http://localhost/api/stripe/webhook", {
        method: "POST",
        body,
        headers: { "stripe-signature": signature },
      })
      const res = await webhookPOST(req)
      expect(res.status).toBe(200)

      const { data: paid } = await admin.from("payments").select("status").eq("id", payment!.id).single()
      expect(paid!.status).toBe("paid")

      const { data: moved } = await admin.from("cases").select("stage").eq("id", caseId).single()
      expect(moved!.stage, "paying should advance the case off 'lead'").not.toBe("lead")
    } finally {
      await admin.from("payments").delete().eq("id", payment!.id)
      await admin.from("cases").delete().eq("id", caseId)
    }
  })
})
