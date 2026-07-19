"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { getMyCase } from "@/lib/portal"
import { createAdminClient } from "@/lib/supabase/admin"
import { logActivity } from "@/lib/activity"

/**
 * PART A / Phase 3 — the applicant's access / deletion / correction requests.
 *
 * The privacy policy has always said "contact us to request access or
 * deletion". This makes that a mechanism with a record rather than an inbox
 * with no follow-through.
 *
 * A request is a TYPED ROW (`data_requests`), not a task: tasks are free text
 * matched by ilike, freely mutable, and — being case-scoped — would be
 * destroyed by the very erasure they record. A task is created ALONGSIDE it,
 * purely so it shows up in the staff worklist.
 */

const KINDS = ["access", "deletion", "correction"] as const

export async function submitDataRequest(formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  await requireRole(["client"])
  const myCase = await getMyCase()
  if (!myCase) return { error: "No case found." }

  const parsed = z
    .object({
      kind: z.enum(KINDS),
      detail: z.string().trim().max(2000).optional(),
    })
    .safeParse({ kind: formData.get("kind"), detail: formData.get("detail") ?? undefined })
  if (!parsed.success) return { error: "Pick what you'd like us to do." }

  const email = (myCase.clients as unknown as { email: string | null } | null)?.email ?? null
  const admin = createAdminClient()

  // One open request of each kind at a time — a second click shouldn't queue a
  // second erasure.
  const { data: existing } = await admin
    .from("data_requests")
    .select("id")
    .eq("case_id", myCase.id)
    .eq("kind", parsed.data.kind)
    .in("status", ["open", "acknowledged"])
    .maybeSingle()
  if (existing) return { ok: true }

  // Service-role justified: data_requests INSERT is client-allowed via
  // case_visible, but requester_email must be SERVER-derived — it's the field
  // that keeps the request legible after the client row is gone, so it can't be
  // supplied by the form.
  const { error } = await admin.from("data_requests").insert({
    case_id: myCase.id,
    client_id: myCase.client_id,
    requester_email: email ?? "unknown",
    kind: parsed.data.kind,
    detail: parsed.data.detail || null,
    status: "open",
  })
  if (error) return { error: "Couldn't file that request. Please email us." }

  await admin.from("tasks").insert({
    case_id: myCase.id,
    title: `Privacy request (${parsed.data.kind}) — ${email ?? "client"}`,
    description:
      "Client filed a data request in the portal. Review it in /admin/privacy. " +
      "Erasure is irreversible and is recorded in data_erasure_log — read docs/DATA_INVENTORY.md first.",
    priority: 1,
    status: "open",
  })

  await logActivity({
    action: "privacy.request_filed",
    caseId: myCase.id,
    entity: "data_request",
    detail: { kind: parsed.data.kind },
  })

  revalidatePath("/portal/privacy")
  return { ok: true }
}
