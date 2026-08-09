"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/auth"
import { logActivity } from "@/lib/activity"
import { backfillMatchesForInstructor } from "@/lib/marketplace/offers"
import { CACHE_TAGS } from "@/lib/public-data"

const NYC_BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "The Bronx", "Staten Island"]

/** Verify / un-verify an instructor (gates whether clients can see them). */
export async function setInstructorVerified(formData: FormData) {
  // V3-P0.3 — verification is a trust/compliance decision; admin only.
  await requireAdmin()
  const id = String(formData.get("id") ?? "")
  const verified = formData.get("verified") === "true"

  const supabase = await createClient()
  const { error } = await supabase
    .from("instructors")
    .update({ verified, verified_at: verified ? new Date().toISOString() : null })
    .eq("id", id)
  if (error) throw error

  // Approval is a persistent-scan trigger: the moment we verify a trainer, match
  // them to every OPEN request already waiting in their area (and fire auto-offer
  // if they enabled it), instead of leaving it until they happen to open their
  // feed. No-op if they aren't yet profile-complete/live-eligible. Service role:
  // system-generated match rows, exactly as the marketplace flow intends.
  if (verified) {
    try {
      await backfillMatchesForInstructor(createAdminClient(), id)
    } catch (e) {
      console.error("backfill matches on verify failed", e)
    }
  }

  await logActivity({
    action: verified ? "instructor.verified" : "instructor.unverified",
    entity: "instructor",
    entityId: id,
  })
  revalidatePath("/admin/instructors")
}

/**
 * Toggle an instructor into (or out of) the PUBLIC /instructors directory, and
 * set the boroughs shown on their public card. Admin-only: appearing on a public,
 * indexable page is a trust decision. The instructor is only actually shown when
 * this is on AND they are verified (the view enforces both) — this is the consent
 * half of that pair. Busts the public cache so the change is visible immediately.
 */
export async function setInstructorPublicListing(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get("id") ?? "")
  const publicProfile = formData.get("public_profile") === "true"
  // Checkboxes named "borough" → only the recognized five, in canonical order.
  const chosen = new Set(formData.getAll("borough").map(String))
  const boroughs = NYC_BOROUGHS.filter((b) => chosen.has(b))

  const supabase = await createClient()
  const { error } = await supabase
    .from("instructors")
    .update({ public_profile: publicProfile, public_boroughs: boroughs })
    .eq("id", id)
  if (error) throw error

  await logActivity({
    action: publicProfile ? "instructor.listed_public" : "instructor.unlisted_public",
    entity: "instructor",
    entityId: id,
  })
  revalidatePath("/admin/instructors")
  // Next 16: revalidateTag requires a profile; "max" = stale-while-revalidate.
  revalidateTag(CACHE_TAGS.instructors, "max")
  revalidatePath("/instructors")
}
