"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth"
import { logActivity } from "@/lib/activity"

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
