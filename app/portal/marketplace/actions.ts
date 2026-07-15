"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logActivity } from "@/lib/activity"
import { createAndMatchOffer } from "@/lib/marketplace/offers"
import { STRIPE_ENABLED } from "@/lib/stripe"
import { createBookingDepositCheckout, platformFeeCents } from "@/lib/stripe/connect"
import type { Database } from "@/lib/supabase/types"

type OfferType = Database["public"]["Enums"]["offer_type"]
type Jurisdiction = Database["public"]["Enums"]["jurisdiction_key"]

export async function createOffer(type: OfferType): Promise<{ matched: number }> {
  await requireRole(["client"])
  const supabase = await createClient()
  const { data: kase } = await supabase
    .from("cases")
    .select("id, clients(borough, track)")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!kase) throw new Error("No case found")

  const client = kase.clients as unknown as { borough: string | null; track: string } | null
  const jurisdiction: Jurisdiction = client?.track === "non_resident" ? "special_carry" : "nyc"

  const admin = createAdminClient()
  const res = await createAndMatchOffer(admin, {
    caseId: kase.id,
    type,
    jurisdiction,
    borough: client?.borough,
  })

  await logActivity({
    action: "offer.created",
    caseId: kase.id,
    entity: "case_offer",
    entityId: res.offerId,
    detail: { type, matched: res.matched },
  })
  revalidatePath("/portal/marketplace")
  return { matched: res.matched }
}

export async function cancelOffer(formData: FormData) {
  await requireRole(["client"])
  const offerId = String(formData.get("offerId") ?? "")
  const supabase = await createClient()
  const { error } = await supabase
    .from("case_offers")
    .update({ status: "cancelled" })
    .eq("id", offerId)
  if (error) throw error
  revalidatePath("/portal/marketplace")
}

/** Client books an available slot (the capacity trigger guards against overbooking). */
export async function createBooking(slotId: string): Promise<{ error?: string; ok?: boolean }> {
  await requireRole(["client"])
  const supabase = await createClient()

  const { data: slot } = await supabase
    .from("availability_slots")
    .select("id, instructor_id, location_id, type, starts_at, ends_at")
    .eq("id", slotId)
    .maybeSingle()
  if (!slot) return { error: "That slot is no longer available" }

  const { data: kase } = await supabase
    .from("cases")
    .select("id, client_id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!kase) return { error: "No case found" }

  const { data: eng } = await supabase
    .from("engagements")
    .select("id")
    .eq("case_id", kase.id)
    .eq("instructor_id", slot.instructor_id)
    .eq("status", "active")
    .maybeSingle()

  const { error } = await supabase.from("bookings").insert({
    case_id: kase.id,
    client_id: kase.client_id,
    instructor_id: slot.instructor_id,
    engagement_id: eng?.id ?? null,
    slot_id: slot.id,
    location_id: slot.location_id,
    type: slot.type,
    status: "requested",
    starts_at: slot.starts_at,
    ends_at: slot.ends_at,
  })
  if (error) {
    // The capacity trigger raises 'Slot is full' → surface a friendly message.
    return { error: /full/i.test(error.message) ? "That slot just filled up." : error.message }
  }

  await logActivity({
    action: "booking.requested",
    caseId: kase.id,
    entity: "booking",
    detail: { slot_id: slotId, type: slot.type },
  })
  revalidatePath("/portal/marketplace")
  return { ok: true }
}

/**
 * Pay a booking deposit via Stripe Connect (ships dark behind STRIPE_ENABLED).
 * Records a pending payment with the platform fee and returns a Checkout URL.
 */
export async function payBookingDeposit(
  bookingId: string
): Promise<{ url?: string; error?: string; skipped?: boolean }> {
  await requireRole(["client"])
  if (!STRIPE_ENABLED) return { skipped: true }

  const supabase = await createClient()
  const { data: b } = await supabase
    .from("bookings")
    .select("id, case_id, client_id, instructor_id, engagement_id")
    .eq("id", bookingId)
    .maybeSingle()
  if (!b) return { error: "Booking not found" }

  const admin = createAdminClient()
  const { data: instr } = await admin
    .from("instructors")
    .select("stripe_connect_account_id, payouts_enabled, price_18h_cents")
    .eq("id", b.instructor_id)
    .single()
  if (!instr?.payouts_enabled || !instr.stripe_connect_account_id) {
    return { error: "This instructor hasn't enabled payouts yet." }
  }

  const total = instr.price_18h_cents ?? 50000
  const deposit = Math.round(total * 0.3)
  const { data: client } = await admin.from("clients").select("email").eq("id", b.client_id).single()
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

  const checkout = await createBookingDepositCheckout({
    amountCents: deposit,
    connectAccount: instr.stripe_connect_account_id,
    bookingId: b.id,
    clientEmail: client?.email,
    baseUrl: base,
    description: "Gun License NYC training deposit",
  })
  if ("skipped" in checkout) return { skipped: true }

  await admin.from("payments").insert({
    case_id: b.case_id,
    client_id: b.client_id,
    booking_id: b.id,
    engagement_id: b.engagement_id,
    amount_cents: deposit,
    type: "deposit",
    status: "pending",
    stripe_connect_account: instr.stripe_connect_account_id,
    application_fee_cents: platformFeeCents(deposit),
    description: "Training deposit",
  })

  return { url: checkout.url ?? undefined }
}
