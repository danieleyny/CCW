/**
 * "Somebody is looking for an instructor" — the green dot on the Feed tab.
 *
 * An instructor shouldn't have to poll their own feed to find out a request came
 * in. `instructors.feed_seen_at` is the watermark: any open request matched to
 * them after that timestamp is new, and opening the feed moves the watermark,
 * which is what makes the dot go away.
 *
 * Deliberately counts REQUESTS THEY HAVEN'T ANSWERED, not everything new — a
 * request they already expressed interest in isn't news to them.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

type DB = SupabaseClient<Database>

/**
 * How many new, unanswered requests are waiting for this instructor.
 *
 * Reads through offer_matches with the caller's own client, so RLS still
 * applies — this is the instructor's own matches, nothing about the applicant.
 */
export async function countUnseenRequests(
  db: DB,
  instructor: { id: string; feed_seen_at: string | null }
): Promise<number> {
  // Counted through the FEED VIEW, not by joining case_offers: an instructor
  // can't read case_offers (case_visible() is false for them — the privacy
  // firewall), so a join there silently returns nothing. The view already
  // encodes "requests that belong in my feed": open, unexpired, mine, verified.
  let q = db
    .from("instructor_offer_feed")
    .select("offer_id", { count: "exact", head: true })
    .is("responded", null)

  // matched_at, not the offer's created_at: a request posted last week but
  // matched to THIS instructor a minute ago is new to them.
  if (instructor.feed_seen_at) q = q.gt("matched_at", instructor.feed_seen_at)

  const { count, error } = await q
  if (error) return 0
  return count ?? 0
}

/**
 * Mark the feed as seen. Called when the instructor opens it — the one action
 * that should clear the dot.
 *
 * The timestamp comes from the DATABASE clock, not the app's: offer_matches.
 * created_at defaults to now() server-side, so a watermark written from a
 * slightly-behind app clock lands before rows that already existed and the dot
 * never clears. One source of time.
 */
export async function markFeedSeen(db: DB, instructorId: string): Promise<void> {
  // The RPC is auth.uid()-scoped (an instructor marking their OWN feed). It
  // returns the new watermark, or null when it matched nobody — a service-role
  // caller has no session, and "updated nothing" must not look like success.
  const { data, error } = await db.rpc("mark_instructor_feed_seen")
  if (!error && data) return

  await db
    .from("instructors")
    .update({ feed_seen_at: new Date().toISOString() })
    .eq("id", instructorId)
}
