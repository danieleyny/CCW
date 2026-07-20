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
      // Everything the profile form, the go-live checklist and the feed signal
      // read — one row, so no surface has to re-query for a single column.
      // NOTE: one literal, not a concatenation — supabase-js infers the row type
      // from the string, and a concatenated select degrades to GenericStringError.
      "id, name, email, phone, bio, dcjs_id, verified, verified_at, active, onboarding_completed_at, service_radius_mi, lat, lng, price_18h_cents, rating_avg, rating_count, jurisdictions, payouts_enabled, stripe_connect_account_id, website_url, instagram_handle, facebook_url, x_handle, years_experience, background, languages, avatar_path, facility_photo_paths, class_format, typical_class_size, provides_range, separate_range_note, range_fee_included, ammo_included, materials_included, whats_to_bring, scheduling_notes, response_time_note, offers_intro_call, intro_call_note, feed_seen_at, auto_offer_enabled, auto_offer_note, auto_offer_price_cents"
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
