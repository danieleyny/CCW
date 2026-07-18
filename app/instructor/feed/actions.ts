"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notifyClient } from "@/lib/email"
import { myInstructorId } from "@/lib/instructor"

/**
 * Express interest in an offer (two-phase marketplace): flags the instructor as
 * interested via the security-definer RPC — the offer stays OPEN and no
 * engagement is created. The applicant then chooses among everyone interested.
 * Notifies the applicant without ever exposing their identity to the instructor.
 */
export async function expressInterest(formData: FormData) {
  await requireRole(["instructor"])
  const offerId = String(formData.get("offerId") ?? "")
  const note = (String(formData.get("note") ?? "").trim() || null)?.slice(0, 500) ?? null
  const supabase = await createClient()

  const { error } = await supabase.rpc("express_interest", {
    p_offer_id: offerId,
    p_note: note ?? undefined,
    p_price_cents: undefined,
  })
  if (error) throw error

  // Notify the applicant (in-app + email) via service role — no PII to instructor.
  const admin = createAdminClient()
  const { data: offer } = await admin.from("case_offers").select("case_id").eq("id", offerId).single()
  if (offer) {
    const { data: kase } = await admin
      .from("cases")
      .select("clients(profile_id, full_name, email)")
      .eq("id", offer.case_id)
      .single()
    const client = kase?.clients as unknown as {
      profile_id: string | null
      full_name: string
      email: string | null
    } | null
    if (client?.profile_id) {
      await admin.from("notifications").insert({
        recipient: client.profile_id,
        case_id: offer.case_id,
        kind: "info",
        title: "A verified instructor is interested",
        body: "Open Find an instructor to see who's interested and choose.",
        link: "/portal/marketplace",
      })
    }
    await notifyClient({
      to: client?.email,
      subject: "A verified instructor is interested in your Gun License NYC request",
      body: `Hi ${client?.full_name ?? ""}, a verified instructor is interested. Open your portal to review who's interested and choose.`,
    })
  }

  revalidatePath("/instructor/feed")
}

export async function declineOffer(formData: FormData) {
  await requireRole(["instructor"])
  const offerId = String(formData.get("offerId") ?? "")
  const myId = await myInstructorId()
  if (myId) {
    const supabase = await createClient()
    await supabase
      .from("offer_matches")
      .update({ responded: "declined", responded_at: new Date().toISOString() })
      .eq("offer_id", offerId)
      .eq("instructor_id", myId)
  }
  revalidatePath("/instructor/feed")
}
