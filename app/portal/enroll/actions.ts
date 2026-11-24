"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { getMyCase } from "@/lib/portal"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripe, STRIPE_ENABLED } from "@/lib/stripe"
import { findOrCreateCustomer } from "@/lib/stripe/invoicing"
import { getPackageForBrand } from "@/lib/packages"
import { brandUrl } from "@/lib/brand/origin"
import { getRequestBrandKey } from "@/lib/brand/server"
import { BRANDS, type BrandKey } from "@/config/brands"
import { logActivity } from "@/lib/activity"
import { matchAccessCode } from "@/lib/access-codes"

const startSchema = z.object({
  packageKey: z.string().min(1).max(60),
  mode: z.enum(["full", "deposit"]),
  code: z.string().min(1).max(64).optional(),
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
    code: formData.get("code") || undefined,
  })
  if (!parsed.success) return { error: "Invalid selection." }
  const { packageKey, mode, code } = parsed.data

  const myCase = await getMyCase()
  if (!myCase) return { error: "Your case isn't set up yet." }
  if (!myCase.application_type) redirect("/portal/license-path")
  const requestBrand = await getRequestBrandKey()
  const caseBrand = myCase.brand as BrandKey
  if (requestBrand !== caseBrand) {
    return { error: `This case belongs to ${BRANDS[caseBrand].displayName}. Continue there to pay.` }
  }
  if (BRANDS[caseBrand].payInFull && mode === "deposit") {
    return { error: "This package is paid in full." }
  }

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

  const pkg = await getPackageForBrand(supabase, packageKey, caseBrand)
  if (!pkg) return { error: "That package isn't available." }

  // Never accept a price from the browser. Re-match the submitted code on the
  // server and use only its configured fixed price.
  const discount = code ? matchAccessCode(code, pkg.key) : null
  if (code && (!discount || discount.kind !== "discount")) {
    return { error: "That code isn't valid." }
  }
  if (
    discount &&
    (
      mode !== "full" ||
      !discount.priceCents ||
      !discount.maxUses ||
      discount.priceCents >= pkg.priceCents
    )
  ) {
    return { error: "That code can't be used with this payment option." }
  }

  // Custom-priced packages always go through a human.
  if (pkg.priceCents <= 0) return requestInvoice(supabase, myCase.id, myCase.client_id, caseBrand, pkg.key, pkg.name, 0)

  const amount = discount?.priceCents ?? (mode === "deposit" && pkg.depositCents > 0 ? pkg.depositCents : pkg.priceCents)
  const description =
    discount
      ? `${pkg.name} — discounted full payment (${discount.label})`
      : mode === "deposit" && pkg.depositCents > 0
      ? `${pkg.name} — deposit (balance due on filing)`
      : `${pkg.name} — full payment`

  const stripe = getStripe()
  if (discount && (!STRIPE_ENABLED || !stripe)) {
    return { error: "That one-time code isn't available right now. Please contact us." }
  }

  // Service-role justified: payment and promotion-claim tables are staff-only.
  // The claim stores only a SHA-256 fingerprint, never the customer-facing code.
  const admin = createAdminClient()
  if (discount) {
    const { data: claimState, error: claimError } = await admin.rpc("claim_promo_code", {
      p_code_fingerprint: discount.fingerprint,
      p_code_label: discount.label,
      p_case_id: myCase.id,
      p_client_id: myCase.client_id,
      p_max_uses: discount.maxUses!,
    })
    if (claimError || !claimState) return { error: "Couldn't apply that code. Try again." }
    if (claimState === "exhausted") return { error: "This code has already been used." }
  }
  if (!STRIPE_ENABLED || !stripe) {
    return requestInvoice(supabase, myCase.id, myCase.client_id, caseBrand, pkg.key, description, amount)
  }

  // Pending payment first, so the webhook has something to reconcile.
  // Service-role justified: payments RLS is staff-write-only by design; the
  // amount comes from the DB package table (never client input) after
  // requireRole + case-ownership checks above.
  const paymentType = mode === "deposit" ? "deposit" : "full"
  const { data: pending } = await admin
    .from("payments")
    .select("id")
    .eq("case_id", myCase.id)
    .eq("package_key", pkg.key)
    .eq("amount_cents", amount)
    .eq("type", paymentType)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const payment = pending ?? (
    await admin
      .from("payments")
      .insert({
        case_id: myCase.id,
        client_id: myCase.client_id,
        amount_cents: amount,
        type: paymentType,
        status: "pending",
        description,
        package_key: pkg.key,
        brand: caseBrand,
      })
      .select("id")
      .single()
  ).data
  if (!payment) return { error: "Couldn't start checkout. Try again." }

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

  const brandConfig = BRANDS[caseBrand]
  const metadata = {
    brand: caseBrand,
    payment_id: payment.id,
    package_key: pkg.key,
    case_id: myCase.id,
    client_id: myCase.client_id,
    ...(discount ? { discount_code_label: discount.label } : {}),
  }
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    ...(customerId ? { customer: customerId } : {}),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amount,
          product_data: { name: `${brandConfig.displayName} — ${description}` },
        },
      },
    ],
    integration_identifier: "ccw_checkout_kqmwztar",
    metadata,
    payment_intent_data: {
      metadata,
      ...(brandConfig.stripeDescriptorSuffix
        ? { statement_descriptor_suffix: brandConfig.stripeDescriptorSuffix }
        : {}),
    },
    success_url: brandUrl(caseBrand, "/portal?enrolled=1&session_id={CHECKOUT_SESSION_ID}"),
    cancel_url: brandUrl(caseBrand, "/portal/enroll?canceled=1"),
  })
  await admin.from("payments").update({ stripe_session_id: session.id }).eq("id", payment.id)

  await logActivity({
    action: "package.checkout_started",
    caseId: myCase.id,
    clientId: myCase.client_id,
    entity: "payment",
    entityId: payment.id,
    detail: {
      package: pkg.key,
      mode,
      amount_cents: amount,
      ...(discount ? { discount_code_label: discount.label } : {}),
    },
  })

  if (!session.url) return { error: "Checkout could not be created." }
  redirect(session.url)
}

/** Stripe-dark fallback: record the intent, open a staff task, confirm to the buyer. */
async function requestInvoice(
  _supabase: Awaited<ReturnType<typeof createClient>>,
  caseId: string,
  clientId: string,
  brand: BrandKey,
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
      brand,
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
