"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { getMyCase } from "@/lib/portal"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripe, STRIPE_ENABLED } from "@/lib/stripe"
import { findOrCreateCustomer } from "@/lib/stripe/invoicing"
import { getPackage } from "@/lib/packages"
import { getSiteUrl } from "@/lib/site-url"
import { logActivity } from "@/lib/activity"

const startSchema = z.object({
  packageKey: z.string().min(1).max(60),
  mode: z.enum(["full", "deposit"]),
})

export type EnrollResult = { error?: string; requested?: boolean }

/**
 * V3-P3.1 — self-serve purchase. With Stripe on: creates the pending payment
 * and redirects into Checkout (the webhook reconciles by payment_id metadata,
 * deposit → balance-on-filing stays as a second pending payment). With Stripe
 * dark: gracefully falls back to a recorded invoice request so no buyer is
 * ever dead-ended.
 */
export async function startCheckout(_prev: EnrollResult, formData: FormData): Promise<EnrollResult> {
  await requireRole(["client"])
  const parsed = startSchema.safeParse({
    packageKey: formData.get("packageKey"),
    mode: formData.get("mode") ?? "full",
  })
  if (!parsed.success) return { error: "Invalid selection." }
  const { packageKey, mode } = parsed.data

  const myCase = await getMyCase()
  if (!myCase) return { error: "Your case isn't set up yet." }

  const supabase = await createClient()

  // Eligibility gate on the MONEY path: a case flagged for attorney review (e.g. the
  // applicant reported they are neither a citizen nor a lawful permanent resident,
  // 18 U.S.C. § 922(g)(5)) must not be charged. Route to a human instead of taking
  // payment while eligibility is unresolved.
  const { count: attorneyReview } = await supabase
    .from("activity_log")
    .select("id", { count: "exact", head: true })
    .eq("case_id", myCase.id)
    .eq("action", "intake.attorney_review_required")
  if ((attorneyReview ?? 0) > 0) {
    return { error: "We can't take payment while your eligibility is under attorney review. Your consultant will reach out about the right next step." }
  }

  const pkg = await getPackage(supabase, packageKey)
  if (!pkg) return { error: "That package isn't available." }

  // Custom-priced packages always go through a human.
  if (pkg.priceCents <= 0) return requestInvoice(supabase, myCase.id, myCase.client_id, pkg.key, pkg.name, 0)

  const amount = mode === "deposit" && pkg.depositCents > 0 ? pkg.depositCents : pkg.priceCents
  const description =
    mode === "deposit" && pkg.depositCents > 0
      ? `${pkg.name} — deposit (balance due on filing)`
      : `${pkg.name} — full payment`

  const stripe = getStripe()
  if (!STRIPE_ENABLED || !stripe) {
    return requestInvoice(supabase, myCase.id, myCase.client_id, pkg.key, description, amount)
  }

  // Pending payment first, so the webhook has something to reconcile.
  // Service-role justified: payments RLS is staff-write-only by design; the
  // amount comes from the DB package table (never client input) after
  // requireRole + case-ownership checks above.
  const admin = createAdminClient()
  const { data: payment, error } = await admin
    .from("payments")
    .insert({
      case_id: myCase.id,
      client_id: myCase.client_id,
      amount_cents: amount,
      type: mode === "deposit" ? "deposit" : "full",
      status: "pending",
      description,
      package_key: pkg.key,
    })
    .select("id")
    .single()
  if (error || !payment) return { error: "Couldn't start checkout. Try again." }

  // Attach a reusable Stripe Customer so receipts + saved details work. Best
  // effort: never block a purchase on customer creation.
  let customerId: string | undefined
  try {
    const { data: client } = await admin
      .from("clients")
      .select("id, email, full_name, stripe_customer_id")
      .eq("id", myCase.client_id)
      .single()
    if (client) customerId = await findOrCreateCustomer(admin, stripe, client)
  } catch (e) {
    console.error("[stripe] customer attach (checkout) failed:", e)
  }

  const base = getSiteUrl()
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    ...(customerId ? { customer: customerId } : {}),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amount,
          product_data: { name: `Gun License NYC — ${description}` },
        },
      },
    ],
    metadata: { payment_id: payment.id, package_key: pkg.key, case_id: myCase.id },
    success_url: `${base}/portal?enrolled=1`,
    cancel_url: `${base}/portal/enroll?canceled=1`,
  })
  await admin.from("payments").update({ stripe_session_id: session.id }).eq("id", payment.id)

  await logActivity({
    action: "package.checkout_started",
    caseId: myCase.id,
    clientId: myCase.client_id,
    entity: "payment",
    entityId: payment.id,
    detail: { package: pkg.key, mode, amount_cents: amount },
  })

  if (!session.url) return { error: "Checkout could not be created." }
  redirect(session.url)
}

/** Stripe-dark fallback: record the intent, open a staff task, confirm to the buyer. */
async function requestInvoice(
  _supabase: Awaited<ReturnType<typeof createClient>>,
  caseId: string,
  clientId: string,
  packageKey: string,
  description: string,
  amountCents: number
): Promise<EnrollResult> {
  // Service-role justified: payments/tasks RLS is staff-write-only; every value
  // here is server-derived after requireRole + case-ownership checks.
  const admin = createAdminClient()
  // Don't stack duplicate requests for the same package.
  const { data: existing } = await admin
    .from("payments")
    .select("id")
    .eq("case_id", caseId)
    .eq("package_key", packageKey)
    .eq("status", "pending")
    .maybeSingle()
  if (!existing) {
    await admin.from("payments").insert({
      case_id: caseId,
      client_id: clientId,
      amount_cents: amountCents,
      type: "full",
      status: "pending",
      description: `${description} — invoice requested`,
      package_key: packageKey,
    })
    await admin.from("tasks").insert({
      case_id: caseId,
      title: `Send invoice: ${description}`,
      description: "Client requested this package from the enroll page. Send the invoice / payment link.",
      priority: 1,
      status: "open",
    })
  }
  await logActivity({
    action: "package.invoice_requested",
    caseId,
    clientId,
    entity: "payment",
    detail: { package: packageKey },
  })
  return { requested: true }
}
