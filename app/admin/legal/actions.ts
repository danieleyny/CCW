"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth"
import { logActivity } from "@/lib/activity"
import { isUnenforced } from "@/lib/legal-status"

const reviewChecks = z
  .array(z.enum(["1", "2", "3"]))
  .length(3)
  .refine((checks) => new Set(checks).size === 3, "All three review checks are required")

function reviewEvidence(formData: FormData) {
  const parsed = reviewChecks.safeParse(formData.getAll("checks"))
  if (!parsed.success) throw new Error("Complete all three review checks before marking a rule reviewed.")
  return parsed.data.map(Number)
}

function nextReviewDate(reviewedOn: string) {
  const next = new Date(`${reviewedOn}T12:00:00.000Z`)
  next.setUTCDate(next.getUTCDate() + 90)
  return next.toISOString().slice(0, 10)
}

function datedNote(note: string, existing: string | null, date: string) {
  if (!note.trim()) return existing
  const entry = `[${date}] ${note.trim()}`
  return existing ? `${entry}\n\n${existing}` : entry
}

function revalidateRuleReview() {
  revalidatePath("/admin", "layout")
  revalidatePath("/admin")
  revalidatePath("/admin/legal")
  revalidatePath("/admin/requirements")
}

/** Record the signed-in admin's review of one active jurisdiction version. */
export async function markRequirementVerified(formData: FormData) {
  const auth = await requireAdmin()
  const checks = reviewEvidence(formData)
  const parsed = z.object({ id: z.string().uuid() }).safeParse({ id: formData.get("id") })
  if (!parsed.success) throw new Error("Invalid requirement id")

  const supabase = await createClient()
  const reviewedOn = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from("requirements")
    .update({ needs_legal_review: false, verified_by: auth.userId, verified_on: reviewedOn })
    .eq("id", parsed.data.id)
    .select("req_code, jurisdiction_profiles(label)")
    .single()
  if (error) throw error

  const jurisdiction = (data.jurisdiction_profiles as unknown as { label: string } | null)?.label ?? "Unknown jurisdiction"
  await logActivity({
    action: "requirement.rule_reviewed",
    entity: "requirement",
    entityId: parsed.data.id,
    detail: { req_code: data.req_code, checks, jurisdictions: [jurisdiction], note_present: false },
  })
  revalidateRuleReview()
  return {
    ok: true as const,
    reqCode: data.req_code,
    jurisdiction,
    reviewer: auth.profile.full_name || "Admin",
    reviewedOn,
    nextDue: nextReviewDate(reviewedOn),
  }
}

/** Record enforcement status while completing the same three-check review. */
export async function setRequirementLegalStatus(formData: FormData) {
  const auth = await requireAdmin()
  const checks = reviewEvidence(formData)
  const parsed = z
    .object({
      id: z.string().uuid(),
      legal_status: z.enum(["enforced", "enjoined_not_enforced", "contested", "repealed"]),
      legal_status_note: z.string().trim().max(2000).optional(),
      legal_citation: z.string().trim().max(500).optional(),
    })
    .safeParse({
      id: formData.get("id"),
      legal_status: formData.get("legal_status"),
      legal_status_note: formData.get("legal_status_note") || undefined,
      legal_citation: formData.get("legal_citation") || undefined,
    })
  if (!parsed.success) throw new Error("Invalid rule-review status")
  const { id, legal_status, legal_status_note, legal_citation } = parsed.data

  const supabase = await createClient()
  const { data: before, error: beforeError } = await supabase
    .from("requirements")
    .select("req_code, legal_status, legal_status_note, legal_citation, jurisdiction_profiles(label)")
    .eq("id", id)
    .single()
  if (beforeError) throw beforeError

  const changed = before.legal_status !== legal_status
  if (changed && legal_status !== "enforced" && !legal_status_note) {
    throw new Error("Add a note explaining why this rule is not enforced.")
  }

  const reviewedOn = new Date().toISOString().slice(0, 10)
  const unenforced = isUnenforced(legal_status)
  const note = datedNote(legal_status_note ?? "", before.legal_status_note, reviewedOn)
  const { error } = await supabase
    .from("requirements")
    .update({
      legal_status,
      legal_status_note: note,
      legal_citation: legal_citation ?? before.legal_citation,
      ...(unenforced ? { blocking: false } : {}),
      needs_legal_review: false,
      verified_by: auth.userId,
      verified_on: reviewedOn,
    })
    .eq("id", id)
  if (error) throw error

  const jurisdiction = (before.jurisdiction_profiles as unknown as { label: string } | null)?.label ?? "Unknown jurisdiction"
  await logActivity({
    action: "requirement.rule_status_set",
    entity: "requirement",
    entityId: id,
    detail: {
      req_code: before.req_code,
      from: before.legal_status,
      to: legal_status,
      citation: legal_citation ?? before.legal_citation,
      checks,
      jurisdictions: [jurisdiction],
      note_present: Boolean(legal_status_note),
    },
  })
  revalidateRuleReview()
  return {
    ok: true as const,
    reqCode: before.req_code,
    jurisdiction,
    reviewer: auth.profile.full_name || "Admin",
    reviewedOn,
    nextDue: nextReviewDate(reviewedOn),
  }
}

/** Send a rule back for review with the operator's reason preserved. */
export async function flagRequirementForReview(formData: FormData) {
  const auth = await requireAdmin()
  const parsed = z
    .object({ id: z.string().uuid(), reason: z.string().trim().min(3).max(2000) })
    .safeParse({ id: formData.get("id"), reason: formData.get("reason") })
  if (!parsed.success) throw new Error("Describe what is wrong before flagging this rule.")

  const supabase = await createClient()
  const { data: before, error: beforeError } = await supabase
    .from("requirements")
    .select("req_code, legal_status_note, jurisdiction_profiles(label)")
    .eq("id", parsed.data.id)
    .single()
  if (beforeError) throw beforeError

  const today = new Date().toISOString().slice(0, 10)
  const { error } = await supabase
    .from("requirements")
    .update({
      needs_legal_review: true,
      verified_by: null,
      verified_on: null,
      legal_status_note: datedNote(`Flagged for review: ${parsed.data.reason}`, before.legal_status_note, today),
    })
    .eq("id", parsed.data.id)
  if (error) throw error

  const jurisdiction = (before.jurisdiction_profiles as unknown as { label: string } | null)?.label ?? "Unknown jurisdiction"
  await logActivity({
    action: "requirement.rule_review_flagged",
    entity: "requirement",
    entityId: parsed.data.id,
    detail: { req_code: before.req_code, jurisdiction, reason: parsed.data.reason, flagged_by: auth.userId },
  })
  revalidateRuleReview()
  return { ok: true as const, reqCode: before.req_code, jurisdiction }
}
