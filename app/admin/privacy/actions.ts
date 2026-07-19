"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireStaff, requireAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logActivity } from "@/lib/activity"
import { eraseCase } from "@/lib/privacy/erase"

/** Acknowledge that we've seen a request — staff-level. */
export async function acknowledgeDataRequest(formData: FormData) {
  const auth = await requireStaff()
  const parsed = z.object({ id: z.string().uuid() }).safeParse({ id: formData.get("id") })
  if (!parsed.success) throw new Error("Invalid request id")

  const supabase = await createClient()
  const { error } = await supabase
    .from("data_requests")
    .update({
      status: "acknowledged",
      acknowledged_by: auth.userId,
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id)
  if (error) throw error

  await logActivity({
    action: "privacy.request_acknowledged",
    entity: "data_request",
    entityId: parsed.data.id,
  })
  revalidatePath("/admin/privacy")
}

/** Close a request without erasing — export delivered, correction made, or refused. */
export async function resolveDataRequest(formData: FormData) {
  await requireStaff()
  const parsed = z
    .object({
      id: z.string().uuid(),
      status: z.enum(["fulfilled", "refused"]),
      resolution_note: z.string().trim().max(1000).optional(),
    })
    .safeParse({
      id: formData.get("id"),
      status: formData.get("status"),
      resolution_note: formData.get("resolution_note") ?? undefined,
    })
  if (!parsed.success) throw new Error("Invalid resolution")

  const supabase = await createClient()
  const { error } = await supabase
    .from("data_requests")
    .update({
      status: parsed.data.status,
      resolution_note: parsed.data.resolution_note || null,
      fulfilled_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id)
  if (error) throw error

  await logActivity({
    action: "privacy.request_resolved",
    entity: "data_request",
    entityId: parsed.data.id,
    detail: { status: parsed.data.status },
  })
  revalidatePath("/admin/privacy")
}

/**
 * Execute an erasure. ADMIN-ONLY and irreversible.
 *
 * Requires the operator to type the case's reference to confirm — the same
 * reason `rm -rf` isn't a button. eraseCase() writes to data_erasure_log BEFORE
 * it destroys anything, and throws rather than proceeding if that record can't
 * be written.
 */
export async function executeErasure(formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const auth = await requireAdmin()
  const parsed = z
    .object({ id: z.string().uuid(), confirm: z.string() })
    .safeParse({ id: formData.get("id"), confirm: formData.get("confirm") })
  if (!parsed.success) return { error: "Invalid request." }

  const supabase = await createClient()
  const { data: req } = await supabase
    .from("data_requests")
    .select("id, case_id, kind, requester_email")
    .eq("id", parsed.data.id)
    .single()

  if (!req) return { error: "Request not found." }
  if (req.kind !== "deletion") return { error: "Only a deletion request can be erased." }
  if (!req.case_id) return { error: "This request is no longer attached to a case." }
  if (parsed.data.confirm.trim().toUpperCase() !== "ERASE") {
    return { error: 'Type ERASE to confirm — this cannot be undone.' }
  }

  // Service-role justified: erasure spans tables whose RLS (correctly) forbids
  // deletion by any interactive session, including admin — case_notes and
  // signature_events among them. Gated by requireAdmin + the typed confirmation
  // above, and recorded in data_erasure_log.
  const admin = createAdminClient()
  let receipt
  try {
    receipt = await eraseCase(admin, req.case_id, {
      requestId: req.id,
      actor: auth.userId,
      note: `deletion request from ${req.requester_email}`,
    })
  } catch (err) {
    console.error("[privacy] erasure failed:", err)
    return { error: "Erasure failed and was recorded. Check data_erasure_log before retrying." }
  }

  await admin
    .from("data_requests")
    .update({
      status: "fulfilled",
      fulfilled_at: new Date().toISOString(),
      resolution_note: `Erased: ${Object.entries(receipt.surfaces)
        .map(([k, v]) => `${k} ${v}`)
        .join(", ")}`,
    })
    .eq("id", req.id)

  await logActivity({
    action: "privacy.erasure_executed",
    entity: "data_request",
    entityId: req.id,
    detail: receipt.surfaces,
  })
  revalidatePath("/admin/privacy")
  return { ok: true }
}
