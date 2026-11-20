"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/auth"
import { logActivity } from "@/lib/activity"
import { backfillMatchesForInstructor } from "@/lib/marketplace/offers"
import { CACHE_TAGS } from "@/lib/public-data"
import { sendEmail } from "@/lib/email"
import { renderEmail } from "@/lib/email/template"
import { instructorClaimFlags, loadAdminInstructors } from "@/lib/admin/instructors"
import { goLiveSteps } from "@/lib/instructors/profile"

const NYC_BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "The Bronx", "Staten Island"]
const verifySchema = z.object({
  id: z.string().uuid(), verified: z.boolean(), note: z.string().trim().max(500).optional().default(""),
  reason: z.string().trim().max(1000).optional().default(""), checksConfirmed: z.boolean().optional().default(false),
})
export type InstructorActionResult = { ok: true; matchingFailed?: boolean; matched?: number } | { ok: false; error: string }

export async function setInstructorVerified(input: unknown): Promise<InstructorActionResult> {
  await requireAdmin()
  const parsed = verifySchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "That verification request was invalid." }
  const { id, verified, note, reason, checksConfirmed } = parsed.data
  if (verified && !checksConfirmed) return { ok: false, error: "Complete all three credential checks before verifying." }
  if (!verified && !reason) return { ok: false, error: "A reason is required before un-verifying an instructor." }
  const db = await createClient()
  const { data: instructor } = await db.from("instructors").select("*").eq("id", id).maybeSingle()
  if (!instructor) return { ok: false, error: "Instructor not found." }
  let previewCount = 0
  if (verified) {
    previewCount = (await loadAdminInstructors(db)).find((row) => row.id === id)?.matchPreview ?? 0
    const { data: locations } = await db.from("training_locations").select("is_range, address").eq("instructor_id", id)
    if (instructorClaimFlags(instructor).length) return { ok: false, error: "Fix the applicant-facing claim before verifying this instructor." }
    const openInstructorSteps = goLiveSteps({ ...instructor, verified: false, locations: locations ?? [] }).steps.filter((step) => !step.done && !step.waiting)
    if (openInstructorSteps.length) return { ok: false, error: "The instructor still has profile or onboarding steps to finish." }
  }
  const { error } = await db.from("instructors").update({ verified, verified_at: verified ? new Date().toISOString() : null }).eq("id", id)
  if (error) return { ok: false, error: error.message }
  let matchingFailed = false
  let matched = 0
  if (verified) {
    try {
      // Service role: verification creates system-owned marketplace match rows.
      matched = await backfillMatchesForInstructor(createAdminClient(), id)
    } catch (error) {
      matchingFailed = true
      console.error("backfill matches on verify failed", error)
    }
    await logActivity({ action: "instructor.match_preview", entity: "instructor", entityId: id, detail: { count: previewCount } })
  }
  await logActivity({ action: verified ? "instructor.verified" : "instructor.unverified", entity: "instructor", entityId: id, detail: verified ? { note } : { reason } })
  revalidatePath("/admin/instructors")
  revalidatePath(`/admin/instructors/${id}`)
  revalidatePath("/admin")
  revalidateTag(CACHE_TAGS.instructors, "max")
  revalidatePath("/instructors")
  return { ok: true, matchingFailed, matched }
}

const changesSchema = z.object({ id: z.string().uuid(), note: z.string().trim().min(1).max(1000) })
export async function requestInstructorChanges(input: unknown): Promise<InstructorActionResult> {
  await requireAdmin()
  const parsed = changesSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Add a note for the instructor." }
  const db = await createClient()
  const { data: instructor } = await db.from("instructors").select("id, name, email, profile_id").eq("id", parsed.data.id).maybeSingle()
  if (!instructor) return { ok: false, error: "Instructor not found." }
  if (!instructor.email && !instructor.profile_id) return { ok: false, error: "This instructor has no account or email address." }
  if (instructor.profile_id) {
    // Service role: an admin-authored notice is inserted into the instructor-owned inbox.
    const { error } = await createAdminClient().from("notifications").insert({ recipient: instructor.profile_id, kind: "info", title: "Before we can verify you", body: parsed.data.note, link: "/instructor/profile" })
    if (error) return { ok: false, error: error.message }
  }
  if (instructor.email) {
    const { html, text } = renderEmail({ eyebrow: "Instructor profile", heading: "One change before we verify you", paragraphs: [parsed.data.note], cta: { label: "Open your profile", url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://gunlicensenyc.com"}/instructor/profile` }, recipientReason: "You received this because you created an instructor profile with Gun License NYC." })
    await sendEmail({ to: instructor.email, subject: "One change before we verify you", html, text })
  }
  await logActivity({ action: "instructor.changes_requested", entity: "instructor", entityId: instructor.id, detail: { note: parsed.data.note } })
  revalidatePath("/admin/instructors")
  revalidatePath(`/admin/instructors/${instructor.id}`)
  return { ok: true }
}

export async function retryInstructorMatching(id: string): Promise<InstructorActionResult> {
  await requireAdmin()
  const parsed = z.string().uuid().safeParse(id)
  if (!parsed.success) return { ok: false, error: "Invalid instructor." }
  try {
    // Service role: this retries system-owned marketplace match rows.
    const matched = await backfillMatchesForInstructor(createAdminClient(), parsed.data)
    revalidatePath("/admin/instructors")
    return { ok: true, matched }
  } catch (error) {
    console.error("instructor matching retry failed", error)
    return { ok: false, error: "Matching still could not run. Try again shortly." }
  }
}

export async function setInstructorPublicListing(formData: FormData) {
  await requireAdmin()
  const parsed = z.object({ id: z.string().uuid(), publicProfile: z.boolean() }).safeParse({ id: formData.get("id"), publicProfile: formData.get("public_profile") === "true" })
  if (!parsed.success) throw new Error("Invalid listing request")
  const chosen = new Set(formData.getAll("borough").map(String))
  const boroughs = NYC_BOROUGHS.filter((borough) => chosen.has(borough))
  const db = await createClient()
  const { error } = await db.from("instructors").update({ public_profile: parsed.data.publicProfile, public_boroughs: boroughs }).eq("id", parsed.data.id)
  if (error) throw error
  await logActivity({ action: parsed.data.publicProfile ? "instructor.listed_public" : "instructor.unlisted_public", entity: "instructor", entityId: parsed.data.id, detail: { boroughs } })
  revalidatePath("/admin/instructors")
  revalidatePath(`/admin/instructors/${parsed.data.id}`)
  revalidateTag(CACHE_TAGS.instructors, "max")
  revalidatePath("/instructors")
}
