import "server-only"

import { createClient } from "@/lib/supabase/server"

/**
 * The signed-in client's active case + client record. RLS guarantees a client
 * only ever sees their own row, so we just take the first. Returns null if the
 * client has no case yet (freshly created lead with no case, etc.).
 */
export async function getMyCase() {
  const supabase = await createClient()

  // A4e — bind to THIS login's applicant record explicitly, not RLS alone: a
  // shared device or a future multi-client account must never surface someone
  // else's case just because it sorted first.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: mine } = await supabase.from("clients").select("id").eq("profile_id", user.id)
  const clientIds = (mine ?? []).map((c) => c.id)
  if (clientIds.length === 0) return null

  const { data } = await supabase
    .from("cases")
    .select(
      "id, stage, status, nypd_app_ref, target_file_date, license_expires_on, is_renewal, client_id, clients(id, full_name, email, phone, borough, zip, track)"
    )
    .in("client_id", clientIds)
    // Deterministic "current case": newest, tie-broken by id, so this and
    // provisioning (lib/onboarding.ts) always agree on the same canonical case.
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  const client = data.clients as unknown as {
    id: string
    full_name: string
    email: string | null
    phone: string | null
    borough: string | null
    zip: string | null
    track: string
  }
  return { ...data, client }
}

export type MyCase = NonNullable<Awaited<ReturnType<typeof getMyCase>>>

export type TrainingState = {
  status: "none" | "pending" | "engaged" | "booked"
  interestedCount: number
  instructorName: string | null
  bookingAt: string | null
}

/**
 * Where the applicant is in getting trained — the single source of truth the
 * home cards and welcome nudge share, so "find an instructor" / "book training"
 * prompts disappear the moment they're actually engaged/booked.
 * booked > engaged > pending(open training offer) > none.
 */
export async function getTrainingState(caseId: string): Promise<TrainingState> {
  const supabase = await createClient()
  const base: TrainingState = { status: "none", interestedCount: 0, instructorName: null, bookingAt: null }

  const { data: bookings } = await supabase
    .from("bookings")
    .select("starts_at, status")
    .eq("case_id", caseId)
    .in("status", ["requested", "confirmed", "completed"])
    .order("starts_at", { ascending: true })
  if (bookings && bookings.length > 0) {
    return { ...base, status: "booked", bookingAt: bookings[0].starts_at }
  }

  const { data: eng } = await supabase
    .from("engagements")
    .select("instructors(name)")
    .eq("case_id", caseId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle()
  if (eng) {
    const inst = eng.instructors as unknown as { name: string } | null
    return { ...base, status: "engaged", instructorName: inst?.name ?? "your instructor" }
  }

  const { data: openOffers } = await supabase
    .from("case_offers")
    .select("id")
    .eq("case_id", caseId)
    .eq("status", "open")
    .eq("type", "training")
  if (openOffers && openOffers.length > 0) {
    const { count } = await supabase
      .from("applicant_interest_feed")
      .select("*", { count: "exact", head: true })
    return { ...base, status: "pending", interestedCount: count ?? 0 }
  }

  return base
}
