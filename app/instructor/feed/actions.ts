"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notifyClient } from "@/lib/email"

/** Accept an offer → engagement (via the security-definer RPC) → notify client. */
export async function acceptOffer(formData: FormData) {
  await requireRole(["instructor"])
  const offerId = String(formData.get("offerId") ?? "")
  const supabase = await createClient()

  const { data: engagementId, error } = await supabase.rpc("accept_offer", { p_offer_id: offerId })
  if (error) throw error

  // The instructor cannot read client PII (RLS) — notify via the service-role
  // client without ever exposing the client's identity to the instructor.
  const admin = createAdminClient()
  const { data: eng } = await admin.from("engagements").select("case_id").eq("id", engagementId as string).single()
  if (eng) {
    const { data: kase } = await admin.from("cases").select("clients(full_name, email)").eq("id", eng.case_id).single()
    const client = kase?.clients as unknown as { full_name: string; email: string | null } | null
    await notifyClient({
      to: client?.email,
      subject: "An instructor accepted your CARRY request",
      body: `Hi ${client?.full_name ?? ""}, a verified instructor accepted your request. Open your CARRY portal to book a session.`,
    })
  }

  revalidatePath("/instructor/feed")
  revalidatePath("/instructor/cases")
}

export async function declineOffer(formData: FormData) {
  await requireRole(["instructor"])
  const offerId = String(formData.get("offerId") ?? "")
  const supabase = await createClient()
  const { data: me } = await supabase.from("instructors").select("id").limit(1).maybeSingle()
  if (me) {
    await supabase
      .from("offer_matches")
      .update({ responded: "declined", responded_at: new Date().toISOString() })
      .eq("offer_id", offerId)
      .eq("instructor_id", me.id)
  }
  revalidatePath("/instructor/feed")
}
