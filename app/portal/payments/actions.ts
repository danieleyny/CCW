"use server"

import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth"
import { getStripe } from "@/lib/stripe"

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
    .select("id, amount_cents, type, description, status")
    .eq("id", paymentId)
    .maybeSingle() // RLS → only the client's own payment
  if (!payment) return { error: "Payment not found" }
  if (payment.status === "paid") return { error: "Already paid" }

  const stripe = getStripe()
  if (!stripe) return { disabled: true }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: payment.description ?? `CARRY ${payment.type}` },
          unit_amount: payment.amount_cents,
        },
        quantity: 1,
      },
    ],
    success_url: `${base}/portal/payments?status=success`,
    cancel_url: `${base}/portal/payments?status=canceled`,
    metadata: { payment_id: payment.id },
  })

  await supabase
    .from("payments")
    .update({ stripe_payment_intent: session.id })
    .eq("id", payment.id)

  return { url: session.url ?? undefined }
}
