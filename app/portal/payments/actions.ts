"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireRole } from "@/lib/auth"
import { getStripe } from "@/lib/stripe"
import { findOrCreateCustomer } from "@/lib/stripe/invoicing"
import { getSiteUrl } from "@/lib/site-url"

export type CheckoutResult = { url?: string; disabled?: boolean; error?: string }

/**
 * Start a Stripe Checkout session for an existing pending payment the client
 * owns. Returns { disabled:true } when Stripe isn't configured, so the UI can
 * show a graceful "invoice coming" state instead of failing.
 */
export async function payPending(paymentId: string): Promise<CheckoutResult> {
  await requireRole(["client"])
  const supabase = await createClient()

  const { data: payment } = await supabase
    .from("payments")
    .select("id, case_id, client_id, amount_cents, type, description, status")
    .eq("id", paymentId)
    .maybeSingle() // RLS → only the client's own payment
  if (!payment) return { error: "Payment not found" }
  if (payment.status === "paid") return { error: "Already paid" }

  const stripe = getStripe()
  if (!stripe) return { disabled: true }

  // Attach a reusable Stripe Customer so receipts + saved details work. Best
  // effort (service-role justified: reads/writes the client's own stripe id).
  let customerId: string | undefined
  if (payment.client_id) {
    try {
      const admin = createAdminClient()
      const { data: client } = await admin
        .from("clients")
        .select("id, email, full_name, stripe_customer_id")
        .eq("id", payment.client_id)
        .single()
      if (client) customerId = await findOrCreateCustomer(admin, stripe, client)
    } catch (e) {
      console.error("[stripe] customer attach (payPending) failed:", e)
    }
  }

  const base = getSiteUrl()
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    ...(customerId ? { customer: customerId } : {}),
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: payment.description ?? `Gun License NYC ${payment.type}` },
          unit_amount: payment.amount_cents,
        },
        quantity: 1,
      },
    ],
    success_url: `${base}/portal/payments?status=success`,
    cancel_url: `${base}/portal/payments?status=canceled`,
    metadata: { payment_id: payment.id, case_id: payment.case_id ?? "" },
  })

  // The session id belongs in stripe_session_id — NOT stripe_payment_intent
  // (that column is for the real `pi_…`, set by the webhook). Writing the
  // `cs_…` session id there broke PI-based reconciliation for this path.
  //
  // Service-role for THIS write: `payments` is staff-write-only under RLS, so a
  // client-session update silently no-ops. The row is the caller's own
  // (verified above), and we only stamp the session id we just created.
  await createAdminClient()
    .from("payments")
    .update({ stripe_session_id: session.id })
    .eq("id", payment.id)

  return { url: session.url ?? undefined }
}
