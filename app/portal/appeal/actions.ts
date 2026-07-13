"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { getMyCase } from "@/lib/portal"
import { createAdminClient } from "@/lib/supabase/admin"
import { logActivity } from "@/lib/activity"

/**
 * V3-P3.3 — the honest appeal seam. We cannot file an appeal (38 RCNY: only
 * the applicant or a NY-licensed attorney may submit one); we CAN assemble the
 * record and connect the client with a partner attorney. This records the
 * referral request, tasks staff, and audit-logs it.
 */
export async function requestAttorneyReferral(): Promise<{ ok?: boolean; error?: string }> {
  await requireRole(["client"])
  const myCase = await getMyCase()
  if (!myCase) return { error: "No case found." }

  // Service-role justified: tasks RLS is staff-write-only; this is a system
  // notification with server-derived values after requireRole + ownership.
  const admin = createAdminClient()

  // One open referral request at a time.
  const { data: existing } = await admin
    .from("tasks")
    .select("id")
    .eq("case_id", myCase.id)
    .eq("status", "open")
    .ilike("title", "Attorney referral%")
    .maybeSingle()
  if (!existing) {
    await admin.from("tasks").insert({
      case_id: myCase.id,
      title: "Attorney referral requested (appeal)",
      description:
        "Client requested an attorney referral for their appeal. The 90-day window runs from the denial — connect them with the partner attorney and export the record packet.",
      priority: 1,
      status: "open",
    })
  }

  await logActivity({
    action: "appeal.referral_requested",
    caseId: myCase.id,
    clientId: myCase.client_id,
    entity: "case",
    entityId: myCase.id,
  })
  revalidatePath("/portal/appeal")
  return { ok: true }
}
