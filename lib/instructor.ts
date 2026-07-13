import "server-only"
import { createClient } from "@/lib/supabase/server"

/**
 * V3-P0.1 — Every "my instructor row" lookup MUST filter by
 * profile_id = auth.uid(). RLS alone is not enough: instructors_select_verified
 * exposes every verified instructor to every signed-in user, so an unfiltered
 * `.limit(1)` resolves to the OLDEST VERIFIED instructor, not the caller.
 * Use these helpers — never query "my" instructors row ad hoc.
 */

/** The signed-in user's own instructors row id, or null. */
export async function myInstructorId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from("instructors")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle()
  return data?.id ?? null
}

/** The signed-in instructor's full profile row (bound by profile_id = auth.uid()). */
export async function getMyInstructor() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from("instructors")
    .select(
      "id, name, email, phone, bio, dcjs_id, verified, verified_at, service_radius_mi, lat, lng, price_18h_cents, rating_avg, rating_count, jurisdictions, payouts_enabled, stripe_connect_account_id"
    )
    .eq("profile_id", user.id)
    .maybeSingle()
  return data
}

export type MyInstructor = NonNullable<Awaited<ReturnType<typeof getMyInstructor>>>

export async function getMyTrainingLocations(instructorId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("training_locations")
    .select("id, label, address, is_range, lat, lng")
    .eq("instructor_id", instructorId)
    .order("created_at", { ascending: true })
  return data ?? []
}
