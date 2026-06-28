import { NextResponse, type NextRequest } from "next/server"
import { getStripe, STRIPE_ENABLED } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Stripe webhook handler — scaffolded behind the STRIPE_ENABLED flag. When
 * disabled it returns 503 so the app builds and runs without Stripe keys.
 * Phase 4 expands the event handling (checkout.session.completed, refunds, …).
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe()
  if (!STRIPE_ENABLED || !stripe) {
    return NextResponse.json({ error: "Stripe is not enabled" }, { status: 503 })
  }

  const signature = request.headers.get("stripe-signature")
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !secret) {
    return NextResponse.json({ error: "Missing webhook signature" }, { status: 400 })
  }

  const body = await request.text()
  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret)
  } catch (err) {
    console.error("[stripe] signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = createAdminClient()

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object
      const paymentId = session.metadata?.payment_id
      if (paymentId) {
        await supabase
          .from("payments")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            invoice_url: session.url ?? null,
          })
          .eq("id", paymentId)
      }
      // Marketplace booking deposit (Connect) — reconcile by booking_id.
      const bookingId = session.metadata?.booking_id
      if (bookingId) {
        await supabase
          .from("payments")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            stripe_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : null,
          })
          .eq("booking_id", bookingId)
          .eq("status", "pending")
      }
      break
    }
    case "account.updated": {
      // Connect account finished onboarding → enable payouts for that instructor.
      const acct = event.data.object
      const enabled = Boolean(acct.charges_enabled && acct.payouts_enabled)
      await supabase
        .from("instructors")
        .update({ payouts_enabled: enabled })
        .eq("stripe_connect_account_id", acct.id)
      break
    }
    case "payment_intent.succeeded": {
      const pi = event.data.object
      await supabase
        .from("payments")
        .update({ status: "paid", paid_at: new Date(pi.created * 1000).toISOString() })
        .eq("stripe_payment_intent", pi.id)
      break
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object
      await supabase.from("payments").update({ status: "failed" }).eq("stripe_payment_intent", pi.id)
      break
    }
    default:
      // Unhandled event types are acknowledged so Stripe stops retrying.
      break
  }

  return NextResponse.json({ received: true })
}
