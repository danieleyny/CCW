"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth"
import { logActivity } from "@/lib/activity"
import { isUnenforced } from "@/lib/legal-status"

/**
 * V3-P1.3 — attorney sign-off on a registry rule. Persists WHO verified WHAT
 * and WHEN (replacing the old ephemeral verify-live checklist, which stored
 * nothing). Admin-only: this is a legal-compliance decision.
 */
export async function markRequirementVerified(formData: FormData) {
  const auth = await requireAdmin()
  const parsed = z.object({ id: z.string().uuid() }).safeParse({ id: formData.get("id") })
  if (!parsed.success) throw new Error("Invalid requirement id")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("requirements")
    .update({
      needs_legal_review: false,
      verified_by: auth.userId,
      verified_on: new Date().toISOString().slice(0, 10),
    })
    .eq("id", parsed.data.id)
    .select("req_code")
    .single()
  if (error) throw error

  await logActivity({
    action: "requirement.legal_verified",
    entity: "requirement",
    entityId: parsed.data.id,
    detail: { req_code: data.req_code },
  })
  revalidatePath("/admin/legal")
  revalidatePath("/admin/requirements")
}

/**
 * PART A / Phase 1 — record a rule's LEGAL ENFORCEMENT STATUS.
 *
 * This is the attorney's seam: we track whether a rule is actually enforceable
 * today, with a citation. We do NOT give legal advice and we never invent a
 * case — the citation field is filled by the attorney, and an empty one is
 * honest where a made-up one is not.
 *
 * Setting a status IS a review act, so it stamps the existing
 * verified_by/verified_on/needs_legal_review triple rather than introducing a
 * second, competing "last looked at" date.
 *
 * `blocking:false` is written EXPLICITLY for an unenforced status even though
 * the DB trigger would coerce it anyway (20260719000100) — otherwise the row
 * this action returns disagrees with the row the page re-reads.
 */
export async function setRequirementLegalStatus(formData: FormData) {
  const auth = await requireAdmin()
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
      legal_status_note: formData.get("legal_status_note") ?? undefined,
      legal_citation: formData.get("legal_citation") ?? undefined,
    })
  if (!parsed.success) throw new Error("Invalid legal status")
  const { id, legal_status, legal_status_note, legal_citation } = parsed.data

  const supabase = await createClient()
  // Capture the prior status so the activity log records the transition, not
  // just the destination.
  const { data: before } = await supabase
    .from("requirements")
    .select("req_code, legal_status")
    .eq("id", id)
    .single()

  const unenforced = isUnenforced(legal_status)
  const { error } = await supabase
    .from("requirements")
    .update({
      legal_status,
      legal_status_note: legal_status_note || null,
      legal_citation: legal_citation || null,
      ...(unenforced ? { blocking: false } : {}),
      needs_legal_review: false,
      verified_by: auth.userId,
      verified_on: new Date().toISOString().slice(0, 10),
    })
    .eq("id", id)
  if (error) throw error

  await logActivity({
    action: "requirement.legal_status_set",
    entity: "requirement",
    entityId: id,
    detail: {
      req_code: before?.req_code ?? null,
      from: before?.legal_status ?? null,
      to: legal_status,
      citation: legal_citation || null,
    },
  })
  revalidatePath("/admin/legal")
  revalidatePath("/admin/requirements")
}

/** Send a rule back for review (e.g. after new litigation or an NYPD change). */
export async function flagRequirementForReview(formData: FormData) {
  await requireAdmin()
  const parsed = z.object({ id: z.string().uuid() }).safeParse({ id: formData.get("id") })
  if (!parsed.success) throw new Error("Invalid requirement id")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("requirements")
    .update({ needs_legal_review: true, verified_by: null, verified_on: null })
    .eq("id", parsed.data.id)
    .select("req_code")
    .single()
  if (error) throw error

  await logActivity({
    action: "requirement.legal_review_flagged",
    entity: "requirement",
    entityId: parsed.data.id,
    detail: { req_code: data.req_code },
  })
  revalidatePath("/admin/legal")
  revalidatePath("/admin/requirements")
}
