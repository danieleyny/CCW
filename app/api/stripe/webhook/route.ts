/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from "next/server"
import type Stripe from "stripe"
import { getStripe, STRIPE_ENABLED } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { maybeAdvanceStage } from "@/lib/cases/advance"
import { autoAssignConciergeAgent } from "@/lib/concierge/assign"
import { getTrainingStripe, trainingStripeEnabled } from "@/lib/training/server"
import { sendTrainingPaidEmails } from "@/lib/training/email"

/**
 * Stripe webhook handler — scaffolded behind the STRIPE_ENABLED flag. When
 * disabled it returns 503 so the app builds and runs without Stripe keys.
 * Phase 4 expands the event handling (checkout.session.completed, refunds, …).
 */
export async function POST(request: NextRequest) {
  const primaryStripe = getStripe()
  const trainingStripe = await getTrainingStripe()
  const stripe = primaryStripe ?? trainingStripe
  if ((!STRIPE_ENABLED && !trainingStripeEnabled()) || !stripe) {
    return NextResponse.json({ error: "Stripe is not enabled" }, { status: 503 })
  }

  const signature = request.headers.get("stripe-signature")
  const body = await request.text()
  if (!signature) {
    return NextResponse.json({ error: "Missing webhook signature" }, { status: 400 })
  }
  let event: Stripe.Event | undefined
  for (const candidate of [
    { client: primaryStripe, secret: process.env.STRIPE_WEBHOOK_SECRET },
    { client: trainingStripe, secret: process.env.TRAINING_STRIPE_WEBHOOK_SECRET },
  ]) {
    if (!candidate.client || !candidate.secret) continue
    try {
      event = candidate.client.webhooks.constructEvent(body, signature, candidate.secret)
      break
    } catch {
      // Try the other configured endpoint secret before rejecting the request.
    }
  }
  if (!event) {
    console.error("[stripe] signature verification failed")
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = createAdminClient()
  // The generated database types intentionally lag the just-added training
  // migration during rollout; keep the privileged training branch isolated.
  const trainingDb = supabase as any

  // SEC-23 — idempotency ledger. Stripe delivers each event at-least-once (and
  // an attacker who replays a captured body can't pass signature verification,
  // but a legitimately-retried event must not re-run side effects). Record the
  // event id first; if it's already there, acknowledge and stop.
  const { error: dupErr } = await supabase.from("stripe_events").insert({ id: event.id, type: event.type })
  if (dupErr) {
    // Unique-violation → already processed. Any other error: log and continue
    // (don't drop a real event because the ledger insert hiccuped).
    if (dupErr.code === "23505") return NextResponse.json({ received: true, deduped: true })
    console.error("[stripe] event ledger insert failed:", dupErr.code)
  }

  /**
   * SEC-23 — amount reconciliation. Checkout/invoice amounts are set server-side
   * at creation, so a mismatch means tampering or a bug. We don't hard-fail (that
   * would strand a real payment on a units/rounding edge) but we surface it loudly
   * for reconciliation, and never advance the stage on a short payment.
   */
  async function amountMatches(paymentId: string, paidCents: number | null | undefined): Promise<boolean> {
    if (paidCents == null) return true
    const { data } = await supabase.from("payments").select("amount_cents").eq("id", paymentId).maybeSingle()
    if (!data) return true
    if (data.amount_cents !== paidCents) {
      console.error(`[stripe] AMOUNT MISMATCH payment=${paymentId} expected=${data.amount_cents} paid=${paidCents}`)
      return false
    }
    return true
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object
      const paymentId = session.metadata?.payment_id
      if (paymentId) {
        const amountOk = await amountMatches(paymentId, session.amount_total)
        const { data: paid } = await supabase
          .from("payments")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            invoice_url: session.url ?? null,
          })
          .eq("id", paymentId)
          .select("case_id")
          .maybeSingle()
        // Paying is a milestone the customer can feel; the stage should reflect
        // it without waiting for a staffer. Idempotent, so webhook retries are
        // harmless. Never advance on a short payment (SEC-23).
        if (paid?.case_id && amountOk) {
          await maybeAdvanceStage(supabase, paid.case_id, "signed_up_paid", "payment.paid")
          await autoAssignConciergeAgent(supabase, paid.case_id)
        }
      }
      // Marketplace booking deposit (Connect) — reconcile by booking_id.
      const bookingId = session.metadata?.booking_id
      if (bookingId) {
        const { data: deposit } = await supabase
          .from("payments")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            stripe_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : null,
          })
          .eq("booking_id", bookingId)
          .eq("status", "pending")
          .select("case_id")
          .maybeSingle()
        if (deposit?.case_id) {
          await maybeAdvanceStage(supabase, deposit.case_id, "training_scheduled", "booking.deposit_paid")
        }
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
      const registrationId = pi.metadata?.registrationId
      if (registrationId) {
        const { data: registration } = await trainingDb
          .from("training_registrations")
          .update({ status: "paid", paid_at: new Date().toISOString(), amount_cents: pi.amount_received })
          .eq("id", registrationId)
          .eq("stripe_payment_intent_id", pi.id)
          .eq("status", "pending_payment")
          .select("*")
          .maybeSingle()
        if (registration) {
          const { data: course } = await trainingDb
            .from("training_classes")
            .select("title,sessions,location_public,vendor_class_urls,vendor_access_code")
            .eq("id", (registration as { class_id: string }).class_id)
            .maybeSingle()
          if (course) {
            await sendTrainingPaidEmails({
              registration,
              course,
            })
          }
        }
        break
      }
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
    // ── Stripe Invoicing (admin-issued hosted invoices) ──────────────────────
    // All keyed on metadata.payment_id (set when the invoice was created),
    // falling back to stripe_invoice_id. Same idempotent update-by-key +
    // forward-only stage advance as the Checkout path — retries are harmless.
    case "invoice.finalized": {
      const invoice = event.data.object
      const paymentId = invoice.metadata?.payment_id
      const patch = {
        stripe_invoice_id: invoice.id,
        hosted_invoice_url: invoice.hosted_invoice_url ?? null,
      }
      if (paymentId) await supabase.from("payments").update(patch).eq("id", paymentId)
      else await supabase.from("payments").update(patch).eq("stripe_invoice_id", invoice.id)
      break
    }
    case "invoice.paid": {
      const invoice = event.data.object
      const paymentId = invoice.metadata?.payment_id
      const amountOk = paymentId ? await amountMatches(paymentId, invoice.amount_paid) : true
      const query = supabase
        .from("payments")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .select("case_id")
      const { data: paid } = paymentId
        ? await query.eq("id", paymentId).maybeSingle()
        : await query.eq("stripe_invoice_id", invoice.id).maybeSingle()
      if (paid?.case_id && amountOk) {
        await maybeAdvanceStage(supabase, paid.case_id, "signed_up_paid", "invoice.paid")
        await autoAssignConciergeAgent(supabase, paid.case_id)
      }
      break
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object
      const paymentId = invoice.metadata?.payment_id
      const q = supabase.from("payments").update({ status: "failed" })
      if (paymentId) await q.eq("id", paymentId)
      else await q.eq("stripe_invoice_id", invoice.id)
      break
    }
    default:
      // Unhandled event types are acknowledged so Stripe stops retrying.
      break
  }

  return NextResponse.json({ received: true })
}
