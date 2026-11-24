"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { getMyCase } from "@/lib/portal"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getPackageForBrand } from "@/lib/packages"
import { getStripe, STRIPE_ENABLED } from "@/lib/stripe"
import { findOrCreateCustomer } from "@/lib/stripe/invoicing"
import { BRANDS } from "@/config/brands"
import { brandUrl } from "@/lib/brand/origin"
import { getRequestBrandKey } from "@/lib/brand/server"
import { logActivity } from "@/lib/activity"
import { BRAND_UPGRADE_CONSENT, calculateUpgradeQuote } from "@/lib/brand/upgrade"

const schema = z.object({ consent: z.literal("yes") })

export type UpgradeState = { error?: string }

export async function startUpgrade(_prev: UpgradeState, formData: FormData): Promise<UpgradeState> {
  const { profile } = await requireRole(["client"])
  const parsed = schema.safeParse({ consent: formData.get("consent") })
  if (!parsed.success) return { error: "Please agree to the case transfer before continuing." }

  const myCase = await getMyCase()
  if (!myCase) return { error: "Your case isn't set up yet." }
  if ((await getRequestBrandKey()) !== "fl" || myCase.brand !== "fl") {
    return { error: "This upgrade is available only through your Firearm License NYC account." }
  }

  const supabase = await createClient()
  const [{ data: paidRows }, concierge] = await Promise.all([
    supabase
      .from("payments")
      .select("amount_cents")
      .eq("case_id", myCase.id)
      .eq("brand", "fl")
      .eq("package_key", "self_guided")
      .eq("status", "paid")
      .order("paid_at", { ascending: false })
      .limit(1),
    getPackageForBrand(supabase, "full_concierge", "gln"),
  ])
  const paidSelfGuided = paidRows?.[0]
  if (!paidSelfGuided) return { error: "A paid Self-Guided plan is required before upgrading." }
  if (!concierge || concierge.priceCents <= 0) return { error: "The upgrade price is unavailable right now." }
  if (!STRIPE_ENABLED) return { error: "Online upgrade payment is temporarily unavailable. Please contact support." }
  const stripe = getStripe()
  if (!stripe) return { error: "Online upgrade payment is temporarily unavailable. Please contact support." }

  const { creditCents: credit, dueCents: amount } = calculateUpgradeQuote(
    paidSelfGuided.amount_cents,
    concierge.priceCents,
    BRANDS.fl.upgradeCreditMode,
  )
  if (amount <= 0) return { error: "This upgrade needs staff review before it can continue." }

  // Service role is required because payment rows are staff-write-only. All
  // values here are server-derived after auth, ownership, brand and paid-plan checks.
  const admin = createAdminClient()
  const { data: already } = await admin
    .from("payments")
    .select("id, status")
    .eq("case_id", myCase.id)
    .eq("brand", "gln")
    .eq("package_key", "full_concierge")
    .in("status", ["pending", "paid"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (already?.status === "paid") return { error: "This case has already been upgraded." }

  const description = `Upgrade to Full Concierge (credit $${(credit / 100).toFixed(0)} applied)`
  const payment =
    already ??
    (
      await admin
        .from("payments")
        .insert({
          case_id: myCase.id,
          client_id: myCase.client_id,
          amount_cents: amount,
          type: "full",
          status: "pending",
          description,
          package_key: "full_concierge",
          brand: "gln",
        })
        .select("id, status")
        .single()
    ).data
  if (!payment) return { error: "Couldn't start the upgrade. Please try again." }

  let customerId: string | undefined
  try {
    const { data: client } = await admin
      .from("clients")
      .select("id, email, full_name, stripe_customer_id")
      .eq("id", myCase.client_id)
      .single()
    if (client) customerId = await findOrCreateCustomer(admin, stripe, client)
  } catch (error) {
    console.error("[stripe] customer attach (brand upgrade) failed:", error)
  }

  const consentedAt = new Date().toISOString()
  const metadata = {
    brand: "gln",
    kind: "brand_upgrade",
    payment_id: payment.id,
    package_key: "full_concierge",
    case_id: myCase.id,
    client_id: myCase.client_id,
    actor_profile_id: profile.id,
    consent_at: consentedAt,
    consent_text: BRAND_UPGRADE_CONSENT,
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
          product_data: { name: `Gun License NYC — ${description}` },
        },
      },
    ],
    integration_identifier: "ccw_checkout_kqmwztar",
    metadata,
    payment_intent_data: { metadata },
    success_url: brandUrl("fl", "/portal/upgrade/done?session_id={CHECKOUT_SESSION_ID}"),
    cancel_url: brandUrl("fl", "/portal/upgrade?canceled=1"),
  })
  await admin.from("payments").update({ stripe_session_id: session.id }).eq("id", payment.id)
  await logActivity({
    action: "brand.upgrade_started",
    caseId: myCase.id,
    clientId: myCase.client_id,
    entity: "payment",
    entityId: payment.id,
    detail: { amount_cents: amount, credit_cents: credit, consent_text: BRAND_UPGRADE_CONSENT, consented_at: consentedAt },
  })

  if (!session.url) return { error: "Checkout could not be created." }
  redirect(session.url)
}

