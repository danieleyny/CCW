import "server-only"
import { createClient } from "@/lib/supabase/server"

/** The signed-in instructor's profile row (bound by profile_id = auth.uid()). */
export async function getMyInstructor() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("instructors")
    .select(
      "id, name, email, phone, bio, dcjs_id, verified, verified_at, service_radius_mi, lat, lng, price_18h_cents, rating_avg, rating_count, jurisdictions"
    )
    .order("created_at", { ascending: true })
    .limit(1)
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
