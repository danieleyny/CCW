"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logActivity } from "@/lib/activity"

export type ReviewResult = { ok?: boolean; error?: string; url?: string }

/**
 * A trainer's review decision.
 *
 * All the authorization lives in `trainer_review_requirement` — it re-derives
 * the item from `trainer_requirement_feed`, so the view's WHERE clause (the
 * security boundary) is also the guard. This wrapper adds no checks of its own
 * beyond the role, deliberately: two places to get it right is one too many.
 */
export async function reviewRequirement(
  caseRequirementId: string,
  decision: "approved" | "changes_requested",
  note?: string
): Promise<ReviewResult> {
  await requireRole(["instructor"])
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("trainer_review_requirement", {
    p_case_requirement_id: caseRequirementId,
    p_decision: decision,
    p_note: note ?? undefined,
  })
  if (error) return { error: error.message }

  await logActivity({
    action: decision === "approved" ? "trainer.item_approved" : "trainer.changes_requested",
    entity: "case_requirement",
    entityId: caseRequirementId,
    detail: { review_id: data },
  })
  revalidatePath("/instructor/cases")
  revalidatePath("/portal/checklist")
  return { ok: true }
}

export type BulkReviewResult = { ok: number; failed: number; errors: string[] }

/**
 * PART B / Phase 8 — review several items at once.
 *
 * Deliberately a thin loop over the SAME RPC: it re-checks scope, evidence and
 * decision per item, so a bulk wrapper can't widen what a single review can do.
 * One bad item (e.g. no evidence bound) fails on its own without sinking the
 * rest. Revalidate once, at the end.
 */
export async function bulkReviewRequirements(
  caseRequirementIds: string[],
  decision: "approved" | "changes_requested",
  note?: string
): Promise<BulkReviewResult> {
  await requireRole(["instructor"])
  const supabase = await createClient()

  let ok = 0
  const errors: string[] = []
  for (const id of caseRequirementIds) {
    const { data, error } = await supabase.rpc("trainer_review_requirement", {
      p_case_requirement_id: id,
      p_decision: decision,
      p_note: note ?? undefined,
    })
    if (error) {
      errors.push(error.message)
      continue
    }
    ok++
    await logActivity({
      action: decision === "approved" ? "trainer.item_approved" : "trainer.changes_requested",
      entity: "case_requirement",
      entityId: id,
      detail: { review_id: data, bulk: true },
    })
  }

  if (ok > 0) {
    revalidatePath("/instructor/cases")
    revalidatePath("/portal/checklist")
  }
  return { ok, failed: errors.length, errors }
}

/**
 * A short-lived link to a document the trainer is reviewing.
 *
 * Instructors have NO storage grant and never will. The decision of whether
 * they may read these bytes is `trainer_may_read_document()` — asked with the
 * TRAINER'S OWN client so `auth.uid()` is theirs — and only then does the
 * service role mint the URL. Reimplementing that predicate here in TypeScript
 * would create a second answer to the same question.
 */
export async function trainerDocumentUrl(documentId: string): Promise<ReviewResult> {
  await requireRole(["instructor"])
  const supabase = await createClient()

  const { data: allowed, error } = await supabase.rpc("trainer_may_read_document", {
    p_document_id: documentId,
  })
  if (error) return { error: error.message }
  if (!allowed) return { error: "That document isn't part of what you're reviewing." }

  const admin = createAdminClient()
  const { data: doc } = await admin
    .from("documents")
    .select("file_path")
    .eq("id", documentId)
    .maybeSingle()
  if (!doc?.file_path) return { error: "That file isn't available." }

  // Short TTL: this is somebody's identity document, not a permalink.
  const { data: signed } = await admin.storage
    .from("documents")
    .createSignedUrl(doc.file_path, 300)
  if (!signed?.signedUrl) return { error: "Couldn't open that file." }

  await logActivity({
    action: "trainer.document_viewed",
    entity: "document",
    entityId: documentId,
  })
  return { ok: true, url: signed.signedUrl }
}
