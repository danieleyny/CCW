"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { getMyCase } from "@/lib/portal"
import { createAdminClient } from "@/lib/supabase/admin"
import { logActivity } from "@/lib/activity"
import { startCheckout, type EnrollResult } from "@/app/portal/enroll/actions"

const schema = z.object({
  packageKey: z.enum(["self_guided", "full_concierge"]),
  mode: z.enum(["full", "deposit"]),
})

/**
 * CONCIERGE Phase 1 — the post-intake fork. Selecting a path (1) records the
 * experience switch on the case, then (2) hands straight off to the existing
 * checkout so there's ONE payment machine and one price source (the DB package,
 * never hardcoded). Self-Guided and Full Concierge are the same purchase flow at
 * two prices; only `service_mode` diverges the experience afterward.
 *
 * The choice is reversible until paid — re-picking overwrites `service_mode`.
 */
export async function choosePath(_prev: EnrollResult, formData: FormData): Promise<EnrollResult> {
  await requireRole(["client"])
  const parsed = schema.safeParse({
    packageKey: formData.get("packageKey"),
    mode: formData.get("mode") ?? "full",
  })
  if (!parsed.success) return { error: "Please choose a path." }
  const { packageKey } = parsed.data

  const myCase = await getMyCase()
  if (!myCase) return { error: "Your case isn't set up yet." }

  const serviceMode = packageKey === "full_concierge" ? "concierge" : "self_guided"

  // Service-role justified: `cases` is staff-managed (cases_update RLS is
  // is_staff_or_admin only). This is a client-initiated write of a server-derived
  // experience switch to their OWN case, gated by requireRole + getMyCase
  // ownership above — the same convention startCheckout uses for payments.
  const admin = createAdminClient()
  await admin.from("cases").update({ service_mode: serviceMode }).eq("id", myCase.id)

  await logActivity({
    action: "case.path_selected",
    caseId: myCase.id,
    clientId: myCase.client_id,
    entity: "case",
    entityId: myCase.id,
    detail: { service_mode: serviceMode, package: packageKey },
  })

  // Self-Guided: straight to intake, low-friction — they pay when ready (the
  // portal's soft enroll nudge). Full Concierge: pay first ($1,000), then the
  // paid dashboard opens — and they NEVER see intake (we fill it out for them).
  if (serviceMode === "self_guided") {
    redirect("/portal/intake")
  }

  // Concierge → the existing checkout (Stripe → Checkout redirect on success,
  // whose success_url routes a paid concierge case to /portal/concierge;
  // Stripe-off / custom price → recorded invoice-request fallback).
  return startCheckout(_prev, formData)
}
